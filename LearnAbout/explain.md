# SillyTavern 核心逻辑调查报告

## 一句话结论

SillyTavern 的核心并不是“写了一段更强的提示词”，而是一个**上下文编排系统**：它会把角色卡、人格、世界书、扩展注入、聊天历史、生成模式和不同模型供应商的协议差异，统一编译成一份尽可能高质量、尽可能省上下文、且适配目标 API 的请求。

从代码结构看，这条主链路大致是：

`public/script.js` -> `public/scripts/world-info.js` -> `public/scripts/openai.js` -> `src/prompt-converters.js` -> `src/endpoints/backends/chat-completions.js`

也就是说，它本质上是一个：

1. 上游上下文收集器
2. 中间层提示图编译器
3. 下游供应商协议适配器

## 核心判断

如果只用一句更工程化的话来概括这个项目：

**SillyTavern 的真正价值，在于“动态挑选哪些上下文该进 prompt、以什么顺序进、以什么角色进、在 token 不够时谁优先保留”，而不是单纯堆更多提示词。**

这也是它为什么经常比“手写一个 system prompt 然后直接调 API”的效果更稳。

## 1. 总体架构：三层核心逻辑

### 1. 上游：收集当前轮真正相关的上下文

入口在 `public/script.js` 的 `Generate(...)`：

- `public/script.js:4123` 定义生成主入口 `Generate(...)`
- `public/script.js:4332` 开始构造 `coreChat`
- `public/script.js:4454` 构造用于世界书扫描的 `chatForWI`
- `public/script.js:4466` 调用 `getWorldInfoPrompt(...)`
- `public/script.js:5118` 在 chat completion 分支调用 `prepareOpenAIMessages(...)`

这一层做的事，不是直接出 prompt，而是先把“这次生成到底有哪些上下文来源”整理出来，包括：

- 当前聊天历史
- 角色描述
- 角色性格
- 场景设定
- 用户 persona
- 角色卡中的后历史指令 / jailbreak
- 作者注释
- 扩展模块注入的 prompt
- 世界书（World Info）命中的条目
- continue / impersonate / quiet 等生成模式带来的额外控制信息

这一步的重点在于：**先把上下文变成统一的可注入对象，再决定怎么放进最终请求。**

## 2. `setExtensionPrompt(...)`：统一注入接口

`public/script.js:8695` 的 `setExtensionPrompt(...)` 是整个系统里非常关键的抽象。

它把一段上下文统一表示为：

- `value`：内容
- `position`：插入位置
- `depth`：插入深度
- `scan`：是否参与世界书扫描
- `role`：注入时使用的角色
- `filter`：是否启用的条件

这意味着在 SillyTavern 里，很多看起来不同的东西，底层都被统一成“可注入 prompt”：

- 作者注释
- persona 描述
- 深度注入
- quiet prompt
- 扩展模块提供的补充上下文
- 世界书按深度生成的内容
- outlet 形式的注入内容

这个抽象非常重要，因为它说明项目核心不是一条固定模板，而是一张**提示图（prompt graph）**。

## 3. 世界书（World Info）不是静态拼接，而是一个检索引擎

世界书逻辑主要在 `public/scripts/world-info.js`：

- `public/scripts/world-info.js:199` 定义 `WorldInfoBuffer`
- `public/scripts/world-info.js:337` 定义 `matchKeys(...)`
- `public/scripts/world-info.js:429` 定义 `getScore(...)`
- `public/scripts/world-info.js:894` 定义 `getWorldInfoPrompt(...)`
- `public/scripts/world-info.js:4510` 定义 `checkWorldInfo(...)`

### 3.1 世界书扫描输入

在 `public/script.js:4457` 到 `public/script.js:4464`，主流程会构造 `globalScanData`，其中包含：

- personaDescription
- characterDescription
- characterPersonality
- characterDepthPrompt
- scenario
- creatorNotes
- trigger

也就是说，世界书不是只扫描聊天记录，它还能扫描：

- 角色描述
- 角色性格
- 场景
- persona
- 角色深度提示
- 作者备注
- 当前生成触发类型

这使得世界书更像一个“条件激活的知识检索系统”，而不只是 lorebook 文本仓库。

### 3.2 世界书如何判定命中

`checkWorldInfo(...)` 的逻辑非常完整：

- 会先把允许参与扫描的注入内容加入扫描缓冲区，见 `public/scripts/world-info.js:4520`
- 会按预算计算本轮世界书可用 token，见 `public/scripts/world-info.js:4537`
- 会遍历所有条目并做多重过滤：
  - 条目是否禁用
  - 触发类型是否匹配
  - 角色名 / tag 过滤是否通过
  - sticky / cooldown / delay 是否生效
  - 是否要求递归后才可触发
  - 是否被 `@@activate` / `@@dont_activate` 修饰
  - 是否是 constant 条目
  - 主关键词是否命中
  - 次关键词逻辑是否满足

主关键词和次关键词逻辑在这些位置：

- `public/scripts/world-info.js:4711` 到 `public/scripts/world-info.js:4718`
- `public/scripts/world-info.js:4743` 到 `public/scripts/world-info.js:4778`

这说明它不是“命中一个关键字就无脑加入”，而是支持：

- 主关键词
- 次关键词
- AND / NOT 等逻辑
- 正则匹配
- 全词匹配
- 大小写控制
- 分组评分

### 3.3 世界书预算控制

世界书预算是它效果稳定的关键机制之一：

- `public/scripts/world-info.js:4537`：预算按 `world_info_budget * maxContext / 100` 计算
- `public/scripts/world-info.js:4539`：可受 `world_info_budget_cap` 限制
- `public/scripts/world-info.js:4815`：预算溢出后，普通条目会停
- `public/scripts/world-info.js:4855`：追加新条目时再次做 token 检查
- `public/scripts/world-info.js:4811`：支持 `ignoreBudget`

这意味着世界书的设计目标不是“尽量多塞”，而是“在不挤爆上下文的情况下，尽量保留最相关的 lore”。

### 3.4 世界书输出不是一个字符串

`getWorldInfoPrompt(...)` 返回的不只是一个大字符串，而是多路输出：

- `worldInfoBefore`
- `worldInfoAfter`
- `worldInfoExamples`
- `worldInfoDepth`
- `anBefore`
- `anAfter`
- `outletEntries`

位置见：

- `public/scripts/world-info.js:907` 到 `public/scripts/world-info.js:915`

这非常关键，因为它意味着世界书内容可以被放到不同语义位置，而不是全部塞进一段 system prompt。

## 4. Persona、作者注释、深度注入：都被纳入同一编排体系

比如 persona 描述处理在：

- `public/script.js:3092` 到 `public/script.js:3113`

这里可以看到 persona 描述并不是固定放法，它可以：

- 不注入
- 注入到 prompt 内
- 合并到作者注释顶部或底部
- 作为 in-chat depth prompt 注入

世界书返回的 depth 条目也会在主流程里再次注入：

- `public/script.js:4499` 到 `public/script.js:4507`

这说明 SillyTavern 的一个核心思想是：

**上下文质量不只取决于“内容是什么”，还取决于“它出现在 prompt 的什么位置”。**

## 5. Prompt Manager：真正的核心是“提示图”，不是模板字符串

Prompt Manager 在：

- `public/scripts/PromptManager.js:300`
- `public/scripts/PromptManager.js:2003`
- `public/scripts/PromptManager.js:2089`

### 5.1 默认 prompt 槽位

默认 prompt 集合在 `public/scripts/PromptManager.js:2003` 定义，包括：

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

这已经足够说明设计理念：项目不是一条 prompt，而是一组有明确职责的 prompt 槽位。

### 5.2 默认顺序

默认顺序在 `public/scripts/PromptManager.js:2089` 开始定义。

这意味着系统默认认为以下内容的优先级不同：

- 核心主提示
- 世界书前置内容
- persona
- 角色描述
- 性格
- 场景
- 增强定义
- 辅助 prompt
- 世界书后置内容
- 示例对话
- 聊天历史
- 后历史指令

这正是“提示编排器”的行为，而不是“拼大字符串”的行为。

## 6. Chat Completion 路径：真正做了 token 预算管理

chat completion 的核心在 `public/scripts/openai.js`：

- `public/scripts/openai.js:1260` `preparePromptsForChatCompletion(...)`
- `public/scripts/openai.js:1435` `prepareOpenAIMessages(...)`
- `public/scripts/openai.js:1078` `populateChatCompletion(...)`
- `public/scripts/openai.js:836` `populateChatHistory(...)`
- `public/scripts/openai.js:3580` `ChatCompletion`

### 6.1 先构造系统层 prompt

`preparePromptsForChatCompletion(...)` 会把这些内容先变成系统级 prompt：

- `worldInfoBefore`
- `worldInfoAfter`
- `charDescription`
- `charPersonality`
- `scenario`
- `impersonate`
- `quietPrompt`
- `groupNudge`
- `bias`

位置见：

- `public/scripts/openai.js:1266` 到 `public/scripts/openai.js:1279`

之后它还会把扩展 prompt 合并进同一个 prompt 集合：

- `public/scripts/openai.js:1330` 到 `public/scripts/openai.js:1359`

### 6.2 Prompt Manager 与系统 prompt 合并

这里是最关键的一段：

- `public/scripts/openai.js:1362` 到 `public/scripts/openai.js:1385`

这段代码说明：

- 系统生成的 prompt 会映射到 Prompt Manager 的槽位
- 如果 Prompt Manager 对某个槽位设置了角色、注入方式、深度、顺序覆盖，就会应用这些覆盖
- 最终形成一个“用户可配置 + 系统生成”的统一 prompt collection

这就是为什么 SillyTavern 既能保持统一架构，又允许用户深度调 prompt。

### 6.3 角色卡可以覆盖主提示和 jailbreak

`openai.js` 里还有两段很重要：

- `public/scripts/openai.js:1388` 到 `public/scripts/openai.js:1396`
- `public/scripts/openai.js:1398` 到 `public/scripts/openai.js:1405`

这里会把角色卡的：

- system prompt override
- jailbreak prompt override

覆盖到最终 prompt collection 中。

这说明角色卡不是简单数据载体，而是能改变最终提示行为的高优先级输入。

### 6.4 Token budget 是核心控制机制

`prepareOpenAIMessages(...)` 中：

- `public/scripts/openai.js:1456` 创建 `ChatCompletion`
- `public/scripts/openai.js:1460` 设置预算 `openai_max_context - openai_max_tokens`

对应类方法在：

- `public/scripts/openai.js:3647`

这一步的意义非常大：

- 不是把所有内容都塞进去
- 而是先给回复预留空间
- 剩下的 token 才用于 prompt

这就是为什么这个系统在长对话里比“盲目堆上下文”更稳定。

## 7. `populateChatCompletion(...)`：按优先级花 token

`populateChatCompletion(...)` 位于：

- `public/scripts/openai.js:1078`

它做的事情可以概括成：

### 第一步：先放高优先级上下文

- `worldInfoBefore`
- `main`
- `worldInfoAfter`
- `charDescription`
- `charPersonality`
- `scenario`
- `personaDescription`

见：

- `public/scripts/openai.js:1103` 到 `public/scripts/openai.js:1111`

### 第二步：再准备控制类 prompt

包括：

- impersonate prompt
- quiet prompt
- group nudge
- bias
- 各种扩展相对注入

### 第三步：再处理绝对注入和 history

- 绝对注入（in-chat injections）
- 示例对话
- 聊天历史

相关位置：

- `public/scripts/openai.js:1226`
- `public/scripts/openai.js:1230` 到 `public/scripts/openai.js:1235`

这个顺序很关键，因为它表明系统默认优先保住：

1. 角色和场景
2. 世界书
3. 控制性提示
4. 历史

而不是反过来。

## 8. `populateChatHistory(...)`：历史也不是全量塞入

该函数在：

- `public/scripts/openai.js:836`

它会先为这些内容预留预算：

- 新聊天提示
- 群聊 nudge
- continue nudge
- 空用户消息替换
- 媒体内容
- 工具调用相关内容

然后才把聊天历史从近到远逐条插入，只插入预算允许的部分。

这意味着 SillyTavern 的 chat history 不是简单 append，而是一个“预算内尽量保留最近有效上下文”的策略系统。

## 9. 后端不是“魔法提示词引擎”，主要是协议适配器

前端最终通过：

- `public/scripts/openai.js:2820` `sendOpenAIRequest(...)`

把数据发往：

- `/api/backends/chat-completions/generate`

后端主入口在：

- `src/endpoints/backends/chat-completions.js:2018`

### 9.1 后端做什么

后端主要做三类事：

- 根据供应商选择发送分支
- 根据模型能力做 prompt 后处理
- 把统一消息结构转成各家 API 要求的格式

例如：

- Claude 转换：`src/endpoints/backends/chat-completions.js:225`
- Google 转换：`src/endpoints/backends/chat-completions.js:496`
- OpenRouter 特殊处理：`src/endpoints/backends/chat-completions.js:2135`
- 文本补全模式转换：`src/endpoints/backends/chat-completions.js:2338`

### 9.2 统一消息结构到供应商协议

真正的转换函数在：

- `src/prompt-converters.js:85` `postProcessPrompt(...)`
- `src/prompt-converters.js:198` `convertClaudeMessages(...)`
- `src/prompt-converters.js:433` `convertGooglePrompt(...)`
- `src/prompt-converters.js:959` `convertTextCompletionPrompt(...)`
- `src/prompt-converters.js:1308` `embedOpenRouterMedia(...)`
- `src/prompt-converters.js:1369` `addOpenRouterSignatures(...)`

这层的作用不是“决定世界观和行为”，而是：

- 让同一份内部消息结构可以适配不同 API
- 修补各家模型对 system prompt、tool calling、media、reasoning signature 的差异

所以从架构角度说：

**前端决定“发什么内容”，后端更多决定“怎么把这些内容翻译成目标接口能接受的格式”。**

## 10. 这个项目为什么能提升 LLM 效果

从机制层看，提升效果主要来自五件事。

### 10.1 它把“静态设定”和“动态检索”分开了

静态设定包括：

- 角色描述
- 角色性格
- 场景
- persona
- 主 system prompt

动态检索包括：

- 世界书命中条目
- 扩展注入
- depth prompt
- continue / impersonate / quiet 等模式指令

这比把所有信息塞进一大段 system prompt 更稳，因为静态信息长期有效，动态信息按需进入。

### 10.2 它能只放“当前相关”的 lore

世界书检索不是全量加载，而是按：

- 聊天内容
- persona
- 角色描述
- 场景
- 触发器

去激活条目。

这减少了无关上下文对模型注意力的稀释。

### 10.3 它把“放在哪里”当成一等公民

很多系统只关心“内容是什么”，SillyTavern 还关心：

- 是放在 prompt 前还是后
- 是 system 还是 user 还是 assistant role
- 是在历史外，还是按 depth 插入聊天内部
- 是否要作为示例对话插入

这会显著影响模型对指令的服从性和角色稳定性。

### 10.4 它做了预算优先级管理

当上下文不够时，很多系统的退化方式是随机的，SillyTavern 的退化方式是“有策略的”：

- 先保核心设定
- 再保关键控制 prompt
- 再保最近历史
- 不重要内容更早被挤掉

这使得长对话时角色漂移更慢。

### 10.5 它做了供应商适配

不同模型族支持的协议差异很大：

- 有的支持独立 system prompt
- 有的不支持
- 有的消息角色限制严格
- 有的 tool calling 结构完全不同
- 有的媒体格式不同

SillyTavern 在 `prompt-converters.js` 这一层把内部统一结构转成各家最合适的形态，从而让上层 prompt 设计可以复用。

## 11. 什么才是这个项目的“真正核心”

如果要按“核心程度”排序，我会这样看：

### 第一核心：上下文编排

包括：

- `Generate(...)`
- `setExtensionPrompt(...)`
- 各种 persona / 作者注释 / depth prompt / mode prompt 的整合

### 第二核心：世界书检索与激活

包括：

- `WorldInfoBuffer`
- `checkWorldInfo(...)`
- 预算、条件匹配、概率、递归、时间效果

### 第三核心：Prompt Manager + ChatCompletion

包括：

- prompt 槽位
- 顺序
- override
- token budget
- 历史截断策略

### 第四核心：供应商协议转换

包括：

- Claude / Gemini / OpenRouter / Text Completion 等的格式映射

### 非核心但必要：后端 HTTP 代理与服务启动

例如：

- `src/server-main.js`
- `src/endpoints/*.js` 中的密钥读取、请求转发、错误处理

这些很重要，但它们不是决定“酒馆为什么更会写”的根因。

## 12. 最终结论

SillyTavern 的核心逻辑可以概括为：

**它先理解“这次生成真正相关的上下文是什么”，再决定“这些上下文应该以什么顺序、什么角色、什么深度进入请求”，最后再把这份统一内部表示翻译成具体供应商的 API 格式。**

所以它本质上不是一个“prompt 模板项目”，而是一个：

- 检索增强的上下文编排器
- 带优先级的 prompt 编译器
- 多供应商协议适配层

也正因为如此，这个项目的效果提升主要来自：

- 更少无关上下文
- 更稳定的角色约束
- 更合理的 token 分配
- 更灵活的 prompt 放置
- 更贴合目标模型协议的请求结构

## 13. 代码定位摘要

如果后续你要继续深入，我建议优先读这些位置：

- 生成入口：`public/script.js:4123`
- 注入抽象：`public/script.js:8695`
- persona 注入：`public/script.js:3092`
- 世界书调用：`public/script.js:4466`
- 世界书主逻辑：`public/scripts/world-info.js:4510`
- prompt 图定义：`public/scripts/PromptManager.js:2003`
- prompt 编排：`public/scripts/openai.js:1260`
- token 预算与消息装配：`public/scripts/openai.js:1435`
- chat completion 填充：`public/scripts/openai.js:1078`
- provider 转换：`src/prompt-converters.js`
- 后端 chat completion 入口：`src/endpoints/backends/chat-completions.js:2018`

## 14. 范围说明

本报告基于当前本地仓库快照 `D:\\codesaves\\SillyTavern` 的代码观察得出。

结论边界：

- 这里分析的是主仓库已有逻辑
- 不包含具体第三方插件的私有行为
- 不包含用户个人 preset 对 prompt 内容的个别影响
- 但这些不会改变本文对整体架构的判断

结论可信度：高
