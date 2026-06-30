# 可转债申万行业思维导图实现计划

## 背景与目标

用户希望做一个本地可直接打开的可转债行业思维导图网页，参考此前与 DeepSeek 的对话思路：
- 四层可折叠结构：**六大风格板块 → 申万一级行业 → 申万二级行业 → 具体可转债**
- 点击可转债节点后展示转债详细信息
- 使用示例/静态数据，不接入实时行情
- 先本地运行，暂不上线部署

## 技术选型

采用 **ECharts Tree** 作为渲染库：
- 百度出品，中文文档完善，国内 CDN 稳定
- 原生支持折叠/展开、节点点击事件、自定义 `itemStyle` / `label`
- 节点颜色、详情面板、事件处理都更可控，避免 jsMind 自定义元素染色失败的问题
- 通过 `label.backgroundColor` 和 `borderRadius` 可做出接近脑图的圆角标签效果

## 项目结构

```
D:\Codes\sw-map\
├── index.html              # 入口页面，引入 ECharts CDN 与本地脚本
├── css/
│   └── style.css           # 页面布局、脑图容器、详情面板样式
├── js/
│   ├── sectorMapping.js    # 31 个申万一级行业 → 6 大风格板块映射
│   ├── data.js             # 示例可转债数据（JS 对象，避免 file:// 跨域）
│   └── app.js              # 初始化 ECharts、数据转换、事件绑定、详情面板
└── README.md               # 本地运行说明
```

## 数据结构

### 1. 示例转债数据（`js/data.js`）

```js
{
  bondCode: "110059",          // 转债代码
  bondName: "浦发转债",         // 转债名称
  stockCode: "600000",         // 正股代码
  stockName: "浦发银行",         // 正股名称
  remainingScale: 500,         // 剩余规模，纯数字，不带单位
  rating: "AAA",               // 评级
  conversionValue: 102.5,      // 转股价值
  premiumRate: 0.15,           // 溢价率（如 0.15 表示 15%）
  maturityDate: "2025-10-28",  // 到期日期
  swLevel1: "银行",            // 申万一级行业
  swLevel2: "国有大型银行"      // 申万二级行业
}
```

> 注意：`remainingScale` 按用户偏好仅保存数字，页面展示时不追加“亿元”。

### 2. ECharts Tree 节点格式

```js
{
  name: "可转债行业脑图",
  value: "root",
  data: { type: "root" },
  itemStyle: { color: "#3b82f6", borderColor: "#3b82f6" },
  label: { backgroundColor: "#3b82f6", color: "#fff" },
  children: [
    {
      name: "金融地产",
      value: "sector-fin-estate",
      collapsed: false,
      data: { type: "sector", name: "金融地产" },
      itemStyle: { color: "#d97706", borderColor: "#d97706" },
      label: { backgroundColor: "#d97706", color: "#fff" },
      children: [
        {
          name: "银行",
          value: "l1-bank",
          collapsed: true,
          data: { type: "level1", name: "银行" },
          itemStyle: { color: "#f1f5f9", borderColor: "#cbd5e1" },
          label: { backgroundColor: "#f1f5f9", color: "#334155" },
          children: [
            {
              name: "国有大型银行",
              value: "l2-bank-state",
              collapsed: true,
              data: { type: "level2", name: "国有大型银行" },
              children: [
                {
                  name: "浦发转债",
                  value: "bond-110059",
                  data: { type: "bond", bondCode: "110059" },
                  itemStyle: { color: "#ffffff", borderColor: "#94a3b8" },
                  label: { backgroundColor: "#ffffff", color: "#0f172a" }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### 3. 数据转换函数

在 `app.js` 中实现 `buildTreeData(bonds)`：
1. 遍历 `SAMPLE_BONDS`
2. 用 `sectorMapping.js` 找到每只债券对应的六大板块
3. 按 `sector → swLevel1 → swLevel2 → bond` 四级分组
4. 输出 ECharts Tree 数据格式，并为不同层级设置 `itemStyle` / `label`
5. 默认展开到“申万一级行业”层级（`initialTreeDepth: 2`）

## 申万一级行业 → 六大风格板块映射

```js
const SECTOR_MAPPING = {
  "周期": [
    "石油石化", "煤炭", "有色金属", "钢铁", "基础化工",
    "建筑材料", "建筑装饰", "交通运输", "公用事业", "环保"
  ],
  "先进制造": [
    "电力设备", "机械设备", "汽车", "国防军工"
  ],
  "科技(TMT)": [
    "电子", "计算机", "通信", "传媒"
  ],
  "消费": [
    "食品饮料", "家用电器", "轻工制造", "纺织服饰",
    "农林牧渔", "商贸零售", "社会服务", "美容护理"
  ],
  "医药医疗": [
    "医药生物"
  ],
  "金融地产": [
    "银行", "非银金融", "房地产", "综合"
  ]
};
```

合计 31 个申万一级行业。

## 示例转债清单

计划放入 14 只示例转债，覆盖 6 大板块：

| 转债代码 | 转债名称 | 正股名称 | 剩余规模 | 评级 | 申万一级 | 申万二级 |
|---|---|---:|---|---|---|
| 110059 | 浦发转债 | 浦发银行 | 500 | AAA | 银行 | 国有大型银行 |
| 113052 | 兴业转债 | 兴业银行 | 250 | AAA | 银行 | 股份制银行 |
| 113021 | 中信转债 | 中信银行 | 400 | AAA | 银行 | 股份制银行 |
| 127018 | 本钢转债 | 本钢板材 | 68 | AA+ | 钢铁 | 普钢 |
| 128126 | 赣锋转债 | 赣锋锂业 | 21 | AA | 有色金属 | 能源金属 |
| 110099 | 万华转债 | 万华化学 | 50 | AAA | 基础化工 | 聚氨酯 |
| 113044 | 大秦转债 | 大秦铁路 | 320 | AAA | 交通运输 | 铁路运输 |
| 113053 | 隆22转债 | 隆基绿能 | 70 | AAA | 电力设备 | 光伏设备 |
| 113061 | 拓普转债 | 拓普集团 | 25 | AA+ | 汽车 | 汽车零部件 |
| 110044 | 航发转债 | 航发动力 | 30 | AAA | 国防军工 | 航空装备 |
| 128137 | 立讯转债 | 立讯精密 | 30 | AAA | 电子 | 消费电子 |
| 113055 | 伊利转债 | 伊利股份 | 45 | AAA | 食品饮料 | 乳制品 |
| 113633 | 科沃转债 | 科沃斯 | 10 | AA | 家用电器 | 小家电 |
| 123040 | 乐普转债 | 乐普医疗 | 16 | AA+ | 医药生物 | 医疗器械 |

## 交互设计

### 折叠/展开
- ECharts Tree 默认点击节点即可折叠/展开子树
- 顶部工具栏提供：
  - “展开全部” / “收起全部”
  - “重置视图”
- 初始化默认展开到“申万一级行业”层级（`initialTreeDepth: 2`）

### 详情面板
- 监听 ECharts `click` 事件
- 当节点 `data.type === 'bond'` 时，根据 `bondCode` 从 `BOND_DETAIL_MAP` 中取出完整信息
- 右侧/悬浮面板展示：转债代码、转债名称、正股代码、正股名称、剩余规模、评级、转股价值、溢价率、到期日期
- 剩余规模仅显示数字，不带单位
- 非债券节点显示层级说明与下级数量

### 节点样式
- 根节点：深蓝
- 六大板块：各自主题色（金融地产-金、周期-橙、先进制造-青、TMT-紫、消费-红、医药医疗-绿）
- 申万一级/二级：浅灰或继承板块色
- 具体转债：白色背景带边框

## 本地运行方式

### 方式一：直接打开（推荐）
- 用浏览器直接打开 `D:\Codes\sw-map\index.html`
- 无需安装依赖，无需启动服务器

### 方式二：本地 HTTP 服务器
```bash
cd D:\Codes\sw-map
python -m http.server 8000
# 访问 http://localhost:8000
```

## 验证方式

1. 双击 `index.html`，页面正常加载思维导图
2. 默认显示根节点 + 六大板块 + 申万一级行业
3. 点击节点展开到二级行业和具体转债
4. 点击转债节点，右侧面板正确显示详细信息
5. 剩余规模字段只显示数字，无“亿元”单位
6. 顶部“展开全部”“收起全部”“重置视图”按钮工作正常

## 关键文件

- `index.html`
- `css/style.css`
- `js/sectorMapping.js`
- `js/data.js`
- `js/app.js`
