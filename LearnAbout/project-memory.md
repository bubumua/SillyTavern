# SillyTavern Project Memory

更新时间：`2026-04-27`

这份文件不是面对新人的教程，而是给后续工作回顾用的“项目记忆”。目标是快速回答下面几类问题：

- 这个仓库的核心逻辑到底是什么
- prompt 是怎么拼起来的
- 预设、角色卡、世界书、正则分别落在哪些结构里
- 插件 / 扩展机制分几层
- 当前仓库里有哪些已经做过的分析和工具页

---

## 1. 当前仓库快照

当前根目录里和本主题最相关的路径：

- `public/script.js`
- `public/scripts/openai.js`
- `public/scripts/world-info.js`
- `public/scripts/PromptManager.js`
- `public/scripts/extensions.js`
- `public/scripts/extensions/regex/engine.js`
- `src/prompt-converters.js`
- `src/endpoints/backends/chat-completions.js`
- `src/plugin-loader.js`
- `plugins.js`
- `explain.md`
- `preset_and_chara/`

当前仓库里样例目录不再叫旧版的 `预设与角色卡`，而是：

- `preset_and_chara/preset/`
- `preset_and_chara/chara/`

典型样例文件：

- 预设样例：`preset_and_chara/preset/Izumi 0406.json`
- 角色卡样例：`preset_and_chara/chara/MoST/性斗学园超级重制版current.json`

说明：

- 早期调查时，样例文件路径是旧目录版本。
- 当前仓库快照下，应优先以 `preset_and_chara/...` 为准。

---

## 2. 对项目的一句话理解

SillyTavern 的核心不是“某一段神奇提示词”，而是一个**上下文编排系统**。

它真正解决的问题是：

- 从哪些来源收集上下文
- 哪些内容应该进入本轮 prompt
- 这些内容应该按什么顺序进入
- 它们分别以 `system / user / assistant` 哪个角色进入
- 当 token 紧张时，谁优先保留、谁优先裁掉
- 最后如何适配不同下游模型接口

主链路可以概括为：

`public/script.js -> public/scripts/world-info.js -> public/scripts/openai.js -> src/prompt-converters.js -> src/endpoints/backends/chat-completions.js`

---

## 3. Prompt 主链路

### 3.1 生成入口

主入口在 `public/script.js` 的生成流程。

关键点：

- 先收集聊天历史、角色字段、persona、扩展注入、世界书扫描输入
- 再调用世界书解析
- 再进入 chat completion 的 prompt 组装
- 最后交给后端供应商适配器

### 3.2 扩展注入抽象

`public/script.js` 里最关键的抽象之一是：

- `setExtensionPrompt(...)`
- `getExtensionPrompt(...)`

这意味着很多来源不同的内容，在底层都被统一为“可注入 prompt 节点”，包括：

- 作者注释
- persona
- depth prompt
- quiet prompt
- 世界书 depth/outlet 条目
- 各类扩展模块注入

这也是为什么更准确的说法不是“模板字符串”，而是“提示图 / prompt graph”。

---

## 4. Chat Completion 组装逻辑

核心文件：`public/scripts/openai.js`

关键函数：

- `preparePromptsForChatCompletion(...)`
- `prepareOpenAIMessages(...)`
- `populateChatCompletion(...)`
- `populateChatHistory(...)`

### 4.1 `preparePromptsForChatCompletion(...)` 的职责

它会先把系统层上下文整理成一个 prompt 集合，再与 Prompt Manager 的槽位系统合并。

可以直接确认的核心系统 prompt 包括：

- `worldInfoBefore`
- `worldInfoAfter`
- `charDescription`
- `charPersonality`
- `scenario`
- `impersonate`
- `quietPrompt`
- `groupNudge`
- `bias`
- `summary`
- `authorsNote`
- `vectorsMemory`
- `vectorsDataBank`
- `smartContext`
- `personaDescription`

然后它再与 Prompt Manager 里的用户顺序定义合并，并对：

- `main`
- `jailbreak`

做角色卡级 override。

### 4.2 关键理解

这里不是“把所有内容拼成一个 system prompt”，而是：

1. 先把 prompt 拆成多个语义节点
2. 再根据顺序、角色、深度、优先级合并
3. 最后在 token 预算内填充上下文

---

## 5. World Info / 世界书机制

核心文件：`public/scripts/world-info.js`

关键函数：

- `getWorldInfoPrompt(...)`
- `checkWorldInfo(...)`

### 5.1 世界书不是静态文本仓库

它更像一个“带预算和条件触发的检索器”。

它不仅扫描聊天历史，还能结合：

- persona description
- character description
- character personality
- character depth prompt
- scenario
- creator notes
- trigger

### 5.2 世界书输出不是单一字符串

世界书最终可以被拆到不同出口：

- `worldInfoBefore`
- `worldInfoAfter`
- `worldInfoExamples`
- `worldInfoDepth`
- `anBefore`
- `anAfter`
- `outletEntries`

关键理解：

- 世界书条目不是“全都塞在同一个位置”
- 不同条目可以进入不同语义区段
- 这正是世界书效果差异的重要来源

### 5.3 世界书预算

世界书会受预算控制，目标不是“尽量多塞”，而是“在预算内保留最相关的 lore”。

重点记忆：

- constant 条目倾向于稳定进入
- selective / keys / secondary_keys / regex / recursion / cooldown / sticky 等共同决定条目是否激活
- `ignoreBudget` 可以让特定条目绕过普通预算约束

---

## 6. PromptManager 的作用

核心文件：`public/scripts/PromptManager.js`

PromptManager 的本质不是“编辑一段大提示词”，而是管理一组有明确职责的 prompt 槽位。

典型槽位：

- `main`
- `nsfw`
- `dialogueExamples`
- `jailbreak`
- `chatHistory`
- `worldInfoAfter`
- `worldInfoBefore`
- `enhanceDefinitions`
- `charDescription`
- `charPersonality`
- `scenario`
- `personaDescription`

关键理解：

- 预设真正控制的是“槽位内容 + 槽位顺序 + 启停状态”
- 不是简单的一段 `system prompt`

---

## 7. 正则机制

核心文件：`public/scripts/extensions/regex/engine.js`

### 7.1 核心 placement

当前核心里能直接确认的 placement：

- `1 = USER_INPUT`
- `2 = AI_OUTPUT`
- `3 = SLASH_COMMAND`
- `5 = WORLD_INFO`
- `6 = REASONING`

### 7.2 角色卡正则的作用方式

角色卡里的 `data.extensions.regex_scripts` 是核心可识别结构。

这类脚本通常承担两类工作：

- `markdownOnly`
  主要做显示层美化
- `promptOnly`
  主要做送回模型前的历史清洗

这会形成一种很典型的结构化回路：

1. 模型输出结构标签
2. UI 正则把标签渲染成更美观的显示
3. promptOnly 正则把这些标签从后续历史中剥掉

### 7.3 关于预设里的 `SPreset.RegexBinding`

`preset_and_chara/preset/Izumi 0406.json` 里存在：

- `extensions.SPreset.RegexBinding`

但在当前仓库核心 JS 搜索中，没有直接找到对 `SPreset` / `RegexBinding` 的核心消费逻辑。

当前更稳妥的结论是：

- 角色卡里的 `data.extensions.regex_scripts` 是核心原生结构
- `SPreset.RegexBinding` 是否生效，可能依赖额外扩展层或定制环境
- 如果以后迁移环境，不应默认把 `SPreset.RegexBinding` 当成“核心一定支持”的字段

---

## 8. 插件与扩展：需要严格区分

这个仓库里至少有两层“可扩展机制”，不能混着理解。

### 8.1 前端扩展 / extensions

核心文件：

- `public/scripts/extensions.js`

职责：

- 发现扩展
- 安装第三方扩展
- 读取扩展设置
- 激活扩展
- 允许扩展注入 prompt、工具、UI、事件等

一个很重要的入口是：

- `loadExtensionSettings(...)`

它会：

1. 合并 `extension_settings`
2. 触发首次加载事件
3. 发现扩展
4. 获取 manifest
5. 激活扩展
6. 需要时连接扩展 API

关键理解：

- 扩展更偏“前端功能模块 / 功能插件”
- 它们经常参与 prompt 注入、UI 增强、检索、向量记忆、工具桥接

### 8.2 服务端插件 / server plugins

核心文件：

- `src/plugin-loader.js`
- `plugins.js`

`plugins.js` 是一个 CLI 管理器，至少支持：

- `node plugins.js update`
- `node plugins.js install <git-url>`

`src/plugin-loader.js` 则负责运行时加载服务端插件。

服务端插件机制的关键点：

- 插件目录默认在 `plugins/`
- 受 `enableServerPlugins` 控制
- 启动时可自动 update
- 每个插件都需要 `info.id/name/description`
- 每个插件都需要 `init(...)`
- 插件可以通过 `express.Router()` 注册自己的接口
- 路由会挂到 `/api/plugins/{id}`
- 如果插件导出 `exit()`，关服时会统一调用

关键理解：

- `extensions` 更偏前端/交互/注入层
- `server plugins` 更偏后端 API 能力扩展
- 两者都叫“插件”，但不是同一个机制

---

## 9. 预设的结构理解

以 `Izumi 0406.json` 这类大型预设为例，不能把它理解成“一个大 prompt 文件”。

更准确地说，它至少包含几类结构：

### 9.1 `prompts[]`

这是最接近“内容词条”的部分。

常见字段：

- `identifier`
- `name`
- `role`
- `content`
- `enabled`
- `injection_position`

这部分本质上是在定义各个 prompt 槽位的候选内容。

### 9.2 `prompt_order`

这部分控制：

- 哪个槽位启用
- 哪个槽位排在前面
- 用户定义顺序如何覆盖默认顺序

### 9.3 `SPreset` 扩展配置

当前样例里可以看到：

- `ChatSquash`
- `RegexBinding`

但对这部分的理解要谨慎：

- 它不是 PromptManager 默认槽位系统本身
- 它更像预设作者自己的附加控制层
- 尤其 `RegexBinding` 不应默认视为核心原生

### 9.4 重要理解

预设文件不是“所有条目都等价”。

至少应区分：

- 真正参与 prompt 内容组装的 `prompts[]`
- 控制顺序的 `prompt_order`
- 预设附加扩展配置
- UI / 作者说明类条目

---

## 10. 角色卡的结构理解

以 `chara_card_v3` 结构为例，角色卡通常至少有两层：

### 10.1 顶层字段

常见字段：

- `name`
- `description`
- `personality`
- `scenario`
- `first_mes`
- `mes_example`
- `spec`
- `spec_version`
- `data`

### 10.2 `data` 层

这里才是更完整的 v2/v3 结构承载层，常见字段包括：

- `system_prompt`
- `post_history_instructions`
- `creator_notes`
- `extensions`
- `character_book`

### 10.3 `character_book.entries[]`

这是大型卡最关键的内容承载层之一。

常见字段：

- `id`
- `keys`
- `secondary_keys`
- `comment`
- `content`
- `constant`
- `selective`
- `insertion_order`
- `enabled`
- `position`
- `use_regex`
- `extensions`

这类词条不是简单的“content + 位置”，而是：

- 内容
- 触发词
- 是否常驻
- 是否启用
- 插入顺序
- 插入区段
- 一组扩展控制字段

### 10.4 `data.extensions.regex_scripts[]`

这是角色卡级正则脚本原生结构。

常见字段：

- `id`
- `scriptName`
- `disabled`
- `runOnEdit`
- `findRegex`
- `trimStrings`
- `replaceString`
- `placement`
- `substituteRegex`
- `minDepth`
- `maxDepth`
- `markdownOnly`
- `promptOnly`

---

## 11. 当前样例记忆

### 11.1 预设样例：`Izumi 0406.json`

当前路径：

- `preset_and_chara/preset/Izumi 0406.json`

记忆重点：

- 它是一个体量很大的 chat-completion 风格预设
- 里面同时存在 `prompts[]`、`prompt_order`、`SPreset`
- 重要槽位可直接看到：
  - `worldInfoBefore`
  - `charDescription`
  - `chatHistory`
  - `jailbreak`
  - `nsfw`
- `nsfw` 在这类预设里经常不只是字面意义上的 NSFW 开关，而可能被作者拿来当“尾部控制槽位”

### 11.2 角色卡样例：`性斗学园超级重制版current.json`

当前路径：

- `preset_and_chara/chara/MoST/性斗学园超级重制版current.json`

当前快照统计：

- `spec = chara_card_v3`
- `spec_version = 3.0`
- 世界书词条总数：`218`
- 已启用词条：`37`
- 启用且 constant 的词条：`34`
- 正则总数：`22`
- 启用正则：`10`

这张卡的典型特征：

- 顶层传统字段大多是空的
- 真正的大部分内容承载在 `character_book.entries`
- 正则脚本很多，说明它高度依赖结构标签 + UI 美化 + prompt 清洗
- 本质上更像“规则引擎卡 / 系统卡”，而不只是普通陪聊角色卡

当前启用词条前几项注释名可作为记忆锚点：

- `uid_1`
- `EJS大型事件控制器`
- `EJS角色控制器`
- `EJS魅力阶段控制器`
- `主线`
- `EJS堕落度阶段控制器`
- `开局COT`
- `人物列表`
- `===人物结束===`
- `数值`

这说明它不仅是 lorebook，还内嵌了控制器式词条和状态机式词条。

---

## 12. 当前已经做过的项目内产物

### 12.1 核心调查报告

已有文档：

- `explain.md`

用途：

- 记录 SillyTavern 核心 prompt 流程和架构调查

### 12.2 角色卡可视化编辑器

当前新增页面：

- `public/character-card-editor.html`
- `public/css/character-card-editor.css`
- `public/scripts/character-card-editor.js`

目标：

- 读取大型角色卡 JSON
- 以更可视化方式编辑卡片元数据
- 编辑 `character_book.entries`
- 编辑 `regex_scripts`
- 导出新的 JSON

当前定位：

- 独立静态工具页
- 不依赖额外后端写回
- 通过浏览器本地读取与导出

---

## 13. 后续工作建议

如果未来继续在这个仓库上做角色卡 / 预设工具，优先级建议如下：

1. 先把 `project-memory.md`、`explain.md`、实际代码三者对齐
2. 优先围绕 `PromptManager + world-info + regex + extensions` 四大点做工具，而不是只盯 JSON 文本
3. 任何“预设可视化编辑器”都要区分：
   - prompt 槽位内容
   - prompt 顺序
   - 预设附加扩展配置
4. 任何“角色卡编辑器”都要区分：
   - 顶层字段
   - `data` 字段
   - `character_book.entries`
   - `regex_scripts`
5. 对 `SPreset.RegexBinding` 一类字段，迁移环境前必须重新验证，不要默认它是仓库核心原生能力

---

## 14. 这份记忆文件的使用方式

以后如果要继续做相关工作，先看这三个文件：

- `project-memory.md`
- `explain.md`
- 目标样例 JSON

然后再决定下一步是：

- 继续分析 prompt 流程
- 改编辑器
- 改角色卡 / 预设数据
- 做抽取、转换、校验脚本

如果代码结构或样例目录再次变化，优先更新这里的“当前仓库快照”和“当前样例记忆”两节。
