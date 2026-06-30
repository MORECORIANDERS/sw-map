# 可转债申万行业思维导图

一个本地即可运行的交互式思维导图网页，用于按申万行业分类整理可转债。

## 功能

- **四层可折叠结构**：六大风格板块 → 申万一级行业 → 申万二级行业 → 具体可转债
- **节点详情面板**：点击任意转债节点，右侧显示代码、名称、正股、剩余规模、评级、转股价值、溢价率、到期日期等信息
- **展开/收起/重置**：顶部工具栏可一键控制脑图视图
- **主题配色**：六大板块使用不同颜色区分

## 数据来源

> 当前使用 `js/data.js` 中的示例静态数据，共 14 只转债，覆盖 6 大风格板块。  
> 注：`remainingScale` 字段仅保存数字，页面展示时不带「亿元」单位。

## 本地运行

### 方式一：直接打开（推荐）

直接用浏览器打开项目根目录下的 `index.html` 即可，无需安装任何依赖。

### 方式二：本地 HTTP 服务器

```bash
cd D:\Codes\sw-map
python -m http.server 8000
```

然后访问 http://localhost:8000。

## 自定义数据

编辑 `js/data.js` 中的 `SAMPLE_BONDS` 数组，按相同字段格式添加或修改转债即可。字段说明：

| 字段 | 说明 |
|---|---|
| `bondCode` | 转债代码 |
| `bondName` | 转债名称 |
| `stockCode` | 正股代码 |
| `stockName` | 正股名称 |
| `remainingScale` | 剩余规模，纯数字，不带单位 |
| `rating` | 信用评级 |
| `conversionValue` | 转股价值 |
| `premiumRate` | 溢价率，小数形式（如 0.15 表示 15%） |
| `maturityDate` | 到期日期，格式 YYYY-MM-DD |
| `swLevel1` | 申万一级行业 |
| `swLevel2` | 申万二级行业 |

## 行业映射

六大风格板块与 31 个申万一级行业的映射关系见 `js/sectorMapping.js`，可根据需要进行调整。

## AKShare 申万宏源研究相关接口

> 数据源：[AKShare 指数数据 - 申万宏源研究](https://akshare.akfamily.xyz/data/index/index.html#id85)  
> 申万宏源研究（SWS Research）官方地址：https://www.swsresearch.com

### 1. 基金指数实时行情

- **接口**：`index_realtime_fund_sw`
- **目标地址**：https://www.swsresearch.com/institute_sw/allIndex/releasedIndex
- **描述**：申万宏源研究-申万指数-指数发布-基金指数-实时行情
- **限量**：该接口返回指定 `symbol` 的数据
- **输入参数**：

  | 名称 | 类型 | 描述 |
  |---|---|---|
  | symbol | str | `symbol="基础一级"`；choice of `{"基础一级", "基础二级", "基础三级", "特色指数"}` |

- **输出参数**：

  | 名称 | 类型 | 描述 |
  |---|---|---|
  | 指数代码 | object | - |
  | 指数名称 | object | - |
  | 昨收盘 | float64 | - |
  | 日涨跌幅 | float64 | 注意单位: % |
  | 年涨跌幅 | float64 | 注意单位: % |

- **接口示例**：

  ```python
  import akshare as ak
  index_realtime_fund_sw_df = ak.index_realtime_fund_sw(symbol="基础一级")
  print(index_realtime_fund_sw_df)
  ```

- **数据示例**：

  ```
       指数代码          指数名称      昨收盘  日涨跌幅  年涨跌幅
  0  807100    申万宏源权益基金指数   770.47 -0.39 -1.40
  1  807200    申万宏源债券基金指数  1043.30  0.04  1.24
  2  807300    申万宏源混合基金指数   947.76 -0.04  0.70
  3  807400    申万宏源货币基金指数  1031.48  0.01  0.50
  4  807500    申万宏源另类基金指数  1119.82  0.09  4.45
  5  807600    申万宏源组合基金指数   874.51  0.46 -0.98
  6  807700  申万宏源QDII基金指数  1063.01  0.03  1.78
  ```

### 2. 基金指数历史行情

- **接口**：`index_hist_fund_sw`
- **目标地址**：https://www.swsresearch.com/institute_sw/allIndex/releasedIndex/fundDetail?code=807100
- **描述**：申万宏源研究-申万指数-指数发布-基金指数-历史行情
- **限量**：该接口返回指定 `symbol` 的数据
- **输入参数**：

  | 名称 | 类型 | 描述 |
  |---|---|---|
  | symbol | str | `symbol="807200"`；基金指数代码 |
  | period | str | `period="day"`；choice of `{"day", "week", "month"}` |

- **输出参数**：

  | 名称 | 类型 | 描述 |
  |---|---|---|
  | 日期 | object | - |
  | 收盘指数 | float64 | - |
  | 开盘指数 | float64 | - |
  | 最高指数 | float64 | - |
  | 最低指数 | float64 | - |
  | 涨跌幅 | float64 | 注意单位: % |

- **接口示例**：

  ```python
  import akshare as ak
  index_hist_fund_sw_df = ak.index_hist_fund_sw(symbol="807200", period="day")
  print(index_hist_fund_sw_df)
  ```

### 3. 申万指数实时行情

- **接口**：`index_realtime_sw`
- **目标地址**：https://www.swsresearch.com/institute_sw/allIndex/releasedIndex
- **描述**：申万宏源研究-指数系列；注意其中大类风格指数和金创指数的字段
- **限量**：该接口返回指定 `symbol` 的数据
- **输入参数**：

  | 名称 | 类型 | 描述 |
  |---|---|---|
  | symbol | str | `symbol="市场表征"`；choice of `{"市场表征", "一级行业", "二级行业", "风格指数", "大类风格指数", "金创指数"}` |

- **输出参数**：

  | 名称 | 类型 | 描述 |
  |---|---|---|
  | 指数代码 | object | - |
  | 指数名称 | object | - |
  | 昨收盘 | float64 | - |
  | 今开盘 | float64 | - |
  | 最新价 | float64 | - |
  | 成交额 | float64 | 注意: 百万元 |
  | 成交量 | float64 | 注意: 百万股 |
  | 最高价 | float64 | - |
  | 最低价 | float64 | - |

- **接口示例**：

  ```python
  import akshare as ak
  index_realtime_sw_df = ak.index_realtime_sw(symbol="市场表征")
  print(index_realtime_sw_df)
  ```

- **数据示例**：

  ```
     指数代码    指数名称  昨收盘    今开盘  ...     成交额      成交量    最高价    最低价
  0  801001     申万50   2845.16  2844.33  ...   89538.41   4310.15  2853.79  2833.67
  1  801002     申万中小  5717.78  5709.18  ...  149570.04  16788.79  5736.68  5697.45
  2  801003     申万Ａ指  3409.20  3407.15  ...  819763.29  78217.24  3420.04  3402.91
  3  801005     申万创业  2296.71  2295.44  ...  200968.64  13626.32  2319.26  2289.86
  4  801250     申万制造  3830.41  3828.93  ...  306683.14  21249.49  3868.12  3815.46
  5  801260     申万消费  6539.86  6537.97  ...  127630.86   9024.97  6544.94  6480.16
  6  801270     申万投资  3242.39  3240.25  ...  167726.08  21787.65  3262.87  3233.94
  7  801280     申万服务  2246.82  2244.55  ...  216829.66  25970.62  2258.63  2240.85
  8  801300  申万300指数  2644.59  2642.95  ...  247861.13  15722.26  2652.15  2635.43
  [9 rows x 9 columns]
  ```

### 4. 申万指数历史行情

- **接口**：`index_hist_sw`
- **目标地址**：https://www.swsresearch.com//institute_sw/allIndex/releasedIndex/releasedetail?code=801002&name=申万中小
- **描述**：申万宏源研究-指数发布-指数详情-指数历史数据
- **限量**：该接口返回指定 `symbol` 和 `period` 的数据
- **输入参数**：

  | 名称 | 类型 | 描述 |
  |---|---|---|
  | symbol | str | `symbol="801030"`；指数代码 |
  | period | str | `period="day"`；choice of `{"day", "week", "month"}` |

- **输出参数**：

  | 名称 | 类型 | 描述 |
  |---|---|---|
  | 代码 | object | - |
  | 日期 | object | - |
  | 收盘 | float64 | - |
  | 开盘 | float64 | - |
  | 最高 | float64 | - |
  | 最低 | float64 | - |
  | 成交量 | float64 | - |
  | 成交额 | float64 | - |

- **接口示例**：

  ```python
  import akshare as ak
  index_hist_sw_df = ak.index_hist_sw(symbol="801193", period="day")
  print(index_hist_sw_df)
  ```

### 5. 申万指数分时行情

- **接口**：`index_min_sw`
- **目标地址**：https://www.swsresearch.com//institute_sw/allIndex/releasedIndex/releasedetail?code=801001&name=申万中小
- **描述**：申万宏源研究-指数发布-指数详情-指数分时数据
- **限量**：该接口返回指定 `symbol` 的数据
- **输入参数**：

  | 名称 | 类型 | 描述 |
  |---|---|---|
  | symbol | str | `symbol="801030"`；指数代码 |

- **输出参数**：

  | 名称 | 类型 | 描述 |
  |---|---|---|
  | 代码 | object | - |
  | 名称 | object | - |
  | 价格 | float64 | - |
  | 日期 | object | - |
  | 时间 | object | - |

- **接口示例**：

  ```python
  import akshare as ak
  index_min_sw_df = ak.index_min_sw(symbol="801001")
  print(index_min_sw_df)
  ```

### 6. 申万指数成分股

- **接口**：`index_component_sw`
- **目标地址**：https://www.swsresearch.com//institute_sw/allIndex/releasedIndex/releasedetail?code=801001&name=申万中小
- **描述**：申万宏源研究-指数发布-指数详情-成分股
- **限量**：该接口返回指定 `symbol` 的数据
- **输入参数**：

  | 名称 | 类型 | 描述 |
  |---|---|---|
  | symbol | str | `symbol="801001"`；指数代码 |

- **输出参数**：

  | 名称 | 类型 | 描述 |
  |---|---|---|
  | 序号 | int64 | - |
  | 证券代码 | object | - |
  | 证券名称 | object | - |
  | 最新权重 | float64 | - |
  | 计入日期 | object | - |

- **接口示例**：

  ```python
  import akshare as ak
  index_component_sw_df = ak.index_component_sw(symbol="801001")
  print(index_component_sw_df)
  ```

- **数据示例**：

  ```
        序号 证券代码  证券名称  最新权重  计入日期
  0      1  000001  平安银行  1.2094  2023-07-03
  1      2  000002   万科A  1.1122  2023-07-03
  2      3  000063  中兴通讯  1.1810  2023-07-03
  3      4  000333  美的集团  3.5702  2023-07-03
  4      5  000568  泸州老窖  2.2004  2023-07-03
  ..   ...     ...   ...     ...         ...
  145  146  601919  中远海控  0.6996  2024-07-01
  146  147  603259  药明康德  1.2209  2024-07-01
  147  148  603993  洛阳钼业  0.7059  2024-07-01
  148  149  688041  海光信息  1.2586  2024-07-01
  149  150  688111  金山办公  0.6166  2024-07-01
  [150 rows x 5 columns]
  ```

### 7. 申万指数分析-日报表

- **接口**：`index_analysis_daily_sw`
- **目标地址**：https://www.swsresearch.com//institute_sw/allIndex/analysisIndex
- **描述**：申万宏源研究-指数分析-日报表
- **限量**：该接口返回指定参数的数据
- **输入参数**：

  | 名称 | 类型 | 描述 |
  |---|---|---|
  | symbol | str | `symbol="市场表征"`；choice of `{"市场表征", "一级行业", "二级行业", "风格指数"}` |
  | start_date | str | `start_date="20221103"` |
  | end_date | str | `end_date="20221103"` |

- **输出参数**：

  | 名称 | 类型 | 描述 |
  |---|---|---|
  | 指数代码 | object | - |
  | 指数名称 | object | - |
  | 发布日期 | object | - |
  | 收盘指数 | float64 | - |
  | 成交量 | float64 | 注意单位: 亿股 |
  | 涨跌幅 | float64 | 注意单位: % |
  | 换手率 | float64 | 注意单位: % |
  | 市盈率 | float64 | 注意单位: 倍 |
  | 市净率 | float64 | 注意单位: 倍 |
  | 均价 | float64 | 注意单位: 元 |
  | 成交额占比 | float64 | 注意单位: % |
  | 流通市值 | float64 | 注意单位: 亿元 |
  | 平均流通市值 | float64 | 注意单位: 亿元 |
  | 股息率 | float64 | 注意单位: % |

- **接口示例**：

  ```python
  import akshare as ak
  index_analysis_daily_sw_df = ak.index_analysis_daily_sw(symbol="市场表征", start_date="20241025", end_date="20241025")
  print(index_analysis_daily_sw_df)
  ```

### 8. 申万指数分析-周报表

- **接口**：`index_analysis_weekly_sw`
- **目标地址**：https://www.swsresearch.com//institute_sw/allIndex/analysisIndex
- **描述**：申万宏源研究-指数分析-周报表
- **限量**：该接口返回指定参数的数据
- **输入参数**：

  | 名称 | 类型 | 描述 |
  |---|---|---|
  | symbol | str | `symbol="市场表征"`；choice of `{"市场表征", "一级行业", "二级行业", "风格指数"}` |
  | date | str | `start_date="20221104"`；通过调用 `ak.index_analysis_week_month_sw(date="week")` 接口获取 |

- **输出参数**：与日报表相同。
- **接口示例**：

  ```python
  import akshare as ak
  index_analysis_weekly_sw_df = ak.index_analysis_weekly_sw(symbol="市场表征", date="20241025")
  print(index_analysis_weekly_sw_df)
  ```

### 9. 申万指数分析-月报表

- **接口**：`index_analysis_monthly_sw`
- **目标地址**：https://www.swsresearch.com/institute_sw/allIndex/analysisIndex
- **描述**：申万宏源研究-指数分析-月报表
- **限量**：该接口返回指定参数的数据
- **输入参数**：

  | 名称 | 类型 | 描述 |
  |---|---|---|
  | symbol | str | `symbol="市场表征"`；choice of `{"市场表征", "一级行业", "二级行业", "风格指数"}` |
  | date | str | `start_date="20221031"`；通过调用 `ak.index_analysis_week_month_sw(date="month")` 接口获取 |

- **输出参数**：与日报表相同。
- **接口示例**：

  ```python
  import akshare as ak
  index_analysis_monthly_sw_df = ak.index_analysis_monthly_sw(symbol="市场表征", date="20240930")
  print(index_analysis_monthly_sw_df)
  ```

## 技术栈

- [ECharts Tree](https://echarts.apache.org/examples/zh/editor.html?c=tree-basic) - 树图/脑图渲染
- 原生 HTML / CSS / JavaScript
