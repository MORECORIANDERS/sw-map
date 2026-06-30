/**
 * 可转债行业思维导图主逻辑（ECharts Tree 版）
 * 数据来源：swIndustryData.js（申万一二三级真实行业数据）
 */

/* ============================
 * 工具：通过正股代码查询申万行业分类
 * ============================ */
function lookupBondIndustry(bondDetail) {
  // 优先通过正股代码在 STOCK_INDUSTRY_MAP 中查询
  if (bondDetail.stockCode && typeof STOCK_INDUSTRY_MAP !== "undefined") {
    const si = STOCK_INDUSTRY_MAP[bondDetail.stockCode];
    if (si && si.l1) {
      return { l1: si.l1, l2: si.l2 || "" };
    }
  }
  // 回退：使用 bond_static 中的行业简称（已映射到全称）
  if (bondDetail.industryLevel1) {
    return { l1: bondDetail.industryLevel1, l2: bondDetail.industryLevel2 || "" };
  }
  return null;
}

/* ============================
 * 预构建债券行业索引（避免重复遍历）
 * ============================ */
var bondIndex = {};
var bondIndexL1 = {};
var bondIndexSector = {};

function buildBondIndex() {
  bondIndex = {};
  bondIndexL1 = {};
  bondIndexSector = {};
  if (typeof BOND_DETAIL_MAP === "undefined") return;

  Object.values(BOND_DETAIL_MAP).forEach(function(b) {
    var ind = lookupBondIndustry(b);
    if (!ind) return;

    // 二级行业索引
    var key = ind.l1 + "|" + ind.l2;
    if (!bondIndex[key]) bondIndex[key] = [];
    bondIndex[key].push(b);

    // 一级行业索引
    var l1Key = "l1|" + ind.l1;
    if (!bondIndexL1[l1Key]) bondIndexL1[l1Key] = [];
    bondIndexL1[l1Key].push(b);

    // 板块索引
    var sector = findSectorByLevel1(ind.l1);
    if (sector) {
      if (!bondIndexSector[sector]) bondIndexSector[sector] = [];
      bondIndexSector[sector].push(b);
    }
  });
}

/* ============================
 * 从真实申万数据构建树
 * ============================ */
function buildTreeData() {
  const root = {
    name: "可转债行业脑图",
    value: "root",
    data: { type: "root" },
    itemStyle: { color: "#3b82f6", borderColor: "#3b82f6" },
    label: { backgroundColor: "#3b82f6", color: "#fff", fontWeight: "bold", fontSize: 14 },
    symbolSize: [20, 16],
    children: []
  };

  // 按 sector -> level1 -> level2 分组
  const groups = {};

  // 遍历二级行业，按"上级行业"挂到对应一级
  SW_INDUSTRY_DATA["二级行业"].forEach(l2 => {
    const l1Name = l2["上级行业"];
    const sector = findSectorByLevel1(l1Name);
    if (!sector) {
      console.warn(`一级行业 "${l1Name}" 未找到所属板块，跳过`);
      return;
    }
    if (!groups[sector]) groups[sector] = {};
    if (!groups[sector][l1Name]) groups[sector][l1Name] = [];
    groups[sector][l1Name].push(l2["行业名称"]);
  });

  // 遍历六大板块构建节点
  SECTOR_ORDER.forEach(sector => {
    if (!groups[sector]) return;
    const sectorColor = SECTOR_COLORS[sector];

    const sectorNode = {
      name: sector,
      value: `sector-${slug(sector)}`,
      collapsed: false,
      data: { type: "sector", name: sector },
      itemStyle: { color: sectorColor, borderColor: sectorColor },
      label: { backgroundColor: sectorColor, color: "#fff", fontWeight: "bold", fontSize: 13 },
      symbolSize: 18,
      children: []
    };
    Object.entries(groups[sector]).forEach(([l1Name, l2List]) => {
      // 一级节点：申万一级行业
      const l1Node = {
        name: l1Name,
        value: `l1-${slug(l1Name)}`,
        collapsed: true,
        data: { type: "level1", name: l1Name },
        itemStyle: { color: "#f1f5f9", borderColor: "#cbd5e1" },
        label: { backgroundColor: "#f1f5f9", color: "#334155", fontSize: 12 },
        symbolSize: 10,
        children: []
      };

      l2List.forEach(l2Name => {
        // 二级节点：申万二级行业
        const l2Node = {
          name: l2Name,
          value: `l2-${slug(l1Name)}-${slug(l2Name)}`,
          collapsed: true,
          data: { type: "level2", name: l2Name, level1: l1Name },
          itemStyle: { color: "#e2e8f0", borderColor: "#cbd5e1" },
          label: { backgroundColor: "#e2e8f0", color: "#475569", fontSize: 11 },
          symbolSize: 6,
          children: []
        };

        // 挂载该二级行业下的可转债（通过正股代码查行业分类）
        var bondsInL2 = bondIndex[l1Name + "|" + l2Name] || [];
        bondsInL2.forEach(function(bond) {
          var showPrice = bond.price !== null && bond.price !== undefined && bond.changePct !== null;
          var displayName = showPrice
            ? bond.bondName + "  " + bond.price.toFixed(2)
            : bond.bondName;
          l2Node.children.push({
            name: displayName,
            value: "bond-" + bond.bondCode,
            data: { type: "bond", bondCode: bond.bondCode },
            itemStyle: { color: "#ffffff", borderColor: "#94a3b8" },
            label: {
              backgroundColor: "rgba(255,255,255,0.85)",
              color: "#334155",
              fontSize: 14,
              fontWeight: "normal",
              padding: [2, 6],
              borderRadius: 3
            },
            symbolSize: 4
          });
        });

        l1Node.children.push(l2Node);
      });

      sectorNode.children.push(l1Node);
    });

    root.children.push(sectorNode);
  });

  return root;
}

/* ============================
 * ECharts 初始化
 * ============================ */
let chart = null;
let treeData = null;

function initChart() {
  const wrapper = document.getElementById("chart-wrapper");
  const container = document.getElementById("chart-container");

  // 画布：宽度100%占满窗口，纵向留足空间可滚动
  const h = wrapper.clientHeight;
  container.style.width = "100%";
  container.style.height = Math.max(h, 2000) + "px";

  chart = echarts.init(container);
  buildBondIndex();
  treeData = buildTreeData();
  const option = getChartOption(treeData);
  chart.setOption(option);

  chart.on("click", handleNodeClick);
  window.addEventListener("resize", () => chart.resize());
}

/* ============================
 * ECharts 配置
 * ============================ */
function getChartOption(data) {
  return {
    tooltip: {
      trigger: "item",
      triggerOn: "mousemove",
      formatter: params => {
        const node = params.data;
        const type = node.data?.type;
        if (type === "bond") {
          const bd = typeof BOND_DETAIL_MAP !== "undefined" ? BOND_DETAIL_MAP[node.data?.bondCode] : null;
          if (bd) {
            const changeStr = bd.changePct !== null
              ? `${bd.changePct >= 0 ? "+" : ""}${bd.changePct.toFixed(2)}%`
              : "-";
            return `<b>${bd.bondName}</b><br/>` +
                   `转债代码: ${bd.bondCode}<br/>` +
                   `正股: ${bd.stockName || "-"}<br/>` +
                   `评级: ${bd.rating || "-"}<br/>` +
                    (bd.price !== null && bd.price !== undefined ? `价格: ${bd.price.toFixed(3)} (${changeStr})` : "");
          }
          return `<b>${node.name}</b><br/>可转债`;
        }
        if (type === "level1") {
          return `<b>${node.name}</b><br/>申万一级行业`;
        }
        if (type === "level2") {
          return `<b>${node.name}</b><br/>申万二级行业`;
        }
        if (type === "sector") {
          return `<b>${node.name}</b><br/>六大风格板块`;
        }
        return node.name;
      }
    },
    series: [
      {
        type: "tree",
        data: [data],
        layout: "orthogonal",
        orient: "LR",
        top: "5%",
        bottom: "5%",
        left: "10%",
        right: "15%",
        symbol: "roundRect",
        symbolSize: [12, 12],
        expandAndCollapse: true,
        initialTreeDepth: 2,
        label: {
          show: true,
          position: "inside",
          verticalAlign: "middle",
          align: "center",
          fontSize: 13,
          padding: [6, 12],
          borderRadius: 6,
          borderWidth: 1,
          borderColor: "inherit",
          formatter: "{b}"
        },
        lineStyle: {
          color: "#cbd5e1",
          width: 2,
          curveness: 0.5
        },
        emphasis: {
          focus: "descendant"
        },
        animationDuration: 400,
        animationDurationUpdate: 300
      }
    ]
  };
}



/* ============================
 * 节点点击处理
 * ============================ */
function handleNodeClick(params) {
  var node = params && params.data;
  if (!node) return;
  const type = node.data?.type;
  const panel = document.getElementById("detail-panel");

  // 高亮当前节点（展开/折叠由 ECharts expandAndCollapse 自动处理）
  chart.dispatchAction({ type: "downplay", seriesIndex: 0 });
  chart.dispatchAction({ type: "highlight", seriesIndex: 0, name: node.name });
  showDetailPanel(panel, node, type);
}

function showDetailPanel(panel, node, type) {
  if (type === "bond") {
    renderBondDetail(panel, node);
  } else if (type === "level1" || type === "level2") {
    renderIndustryDetail(panel, node);
  } else if (type === "sector") {
    renderSectorDetail(panel, node);
  } else {
    renderNodeSummary(panel, node);
  }
  panel.classList.add("open");
  document.getElementById("main").classList.add("panel-open");
  requestAnimationFrame(function() { chart.resize(); });
}

/* ============================
 * 渲染行业节点详情
 * ============================ */
function renderIndustryDetail(panel, node) {
  const type = node.data?.type;
  const name = node.name;
  const level1 = node.data?.level1 || "";
  const sector = findSectorByLevel1(type === "level2" ? level1 : name);
  const sectorColor = SECTOR_COLORS[sector] || "#3b82f6";

  // 查找行业详细信息
  let info = null;
  let peers = [];
  if (type === "level1") {
    info = SW_INDUSTRY_DATA["一级行业"].find(i => i["行业名称"] === name);
    peers = SW_INDUSTRY_DATA["二级行业"].filter(i => i["上级行业"] === name);
  } else if (type === "level2") {
    info = SW_INDUSTRY_DATA["二级行业"].find(i => i["行业名称"] === name);
  }

  let statsHtml = "";
  if (info) {
    statsHtml = `
      <div class="detail-row">
        <span class="label">成份个数</span>
        <span class="value">${info["成份个数"] || "-"}</span>
      </div>
      <div class="detail-row">
        <span class="label">静态市盈率</span>
        <span class="value">${info["静态市盈率"] || "-"}</span>
      </div>
      <div class="detail-row">
        <span class="label">TTM市盈率</span>
        <span class="value">${info["TTM(滚动)市盈率"] || "-"}</span>
      </div>
      <div class="detail-row">
        <span class="label">市净率</span>
        <span class="value">${info["市净率"] || "-"}</span>
      </div>
      <div class="detail-row">
        <span class="label">股息率</span>
        <span class="value">${info["静态股息率"] || "-"}%</span>
      </div>
    `;
  }

  let peersHtml = "";
  if (peers.length > 0) {
    peersHtml = `
      <div class="detail-row">
        <span class="label">下属二级行业</span>
        <span class="value">${peers.length} 个</span>
      </div>
      <div class="tag-list">
        ${peers.map(p => `<span class="tag">${p["行业名称"]}</span>`).join("")}
      </div>
    `;
  }

  // 统计该行业下的可转债数量
  let bondCountHtml = "";
  if (typeof BOND_DETAIL_MAP !== "undefined") {
    let bondCount = 0;
    if (type === "level1") {
      bondCount = (bondIndexL1["l1|" + name] || []).length;
    } else if (type === "level2") {
      bondCount = (bondIndex[level1 + "|" + name] || []).length;
    }
    if (bondCount > 0) {
      bondCountHtml = `
        <div class="detail-row">
          <span class="label">可转债数</span>
          <span class="value" style="color:#3b82f6;font-weight:bold">${bondCount} 只</span>
        </div>
      `;
    }
  }

  panel.innerHTML = `
    <div class="panel-header" style="border-left-color: ${sectorColor}">
      <h3>${name}</h3>
      <button class="close-btn" onclick="closePanel()">&times;</button>
    </div>
    <div class="panel-body">
      <div class="detail-row">
        <span class="label">节点类型</span>
        <span class="value">${type === "level1" ? "申万一级行业" : "申万二级行业"}</span>
      </div>
      <div class="detail-row">
        <span class="label">所属板块</span>
        <span class="value" style="color:${sectorColor};font-weight:bold">${sector || "-"}</span>
      </div>
      ${type === "level2" ? `<div class="detail-row"><span class="label">上级一级</span><span class="value">${level1}</span></div>` : ""}
      ${statsHtml}
      ${peersHtml}
      ${bondCountHtml}
    </div>
  `;
}

/* ============================
 * 渲染可转债节点详情
 * ============================ */
function renderBondDetail(panel, node) {
  const bondCode = node.data?.bondCode;
  const bd = typeof BOND_DETAIL_MAP !== "undefined" ? BOND_DETAIL_MAP[bondCode] : null;
  if (!bd) {
    panel.innerHTML = `
      <div class="panel-header">
        <h3>${node.name}</h3>
        <button class="close-btn" onclick="closePanel()">&times;</button>
      </div>
      <div class="panel-body">
        <p class="hint">暂无详细数据</p>
      </div>
    `;
    return;
  }

  // 通过正股代码获取准确行业分类
  const ind = lookupBondIndustry(bd);
  const displayL1 = ind ? ind.l1 : (bd.industryLevel1 || "-");
  const displayL2 = ind ? ind.l2 : (bd.industryLevel2 || "-");
  const displaySector = ind ? (findSectorByLevel1(ind.l1) || bd.sector || "-") : (bd.sector || "-");
  const sectorColor = SECTOR_COLORS[displaySector] || "#3b82f6";
  const changeColor = bd.changePct !== null
    ? (bd.changePct >= 0 ? "#ef4444" : "#10b981")
    : "#64748b";
  const changeSign = bd.changePct !== null
    ? (bd.changePct >= 0 ? "+" : "")
    : "";
  const changeStr = bd.changePct !== null
    ? `${changeSign}${bd.changePct.toFixed(2)}%`
    : "-";

  panel.innerHTML = `
    <div class="panel-header" style="border-left-color: ${sectorColor}">
      <h3>${bd.bondName}</h3>
      <button class="close-btn" onclick="closePanel()">&times;</button>
    </div>
    <div class="panel-body">
      <div class="detail-row">
        <span class="label">转债代码</span>
        <span class="value">${bd.bondCode}</span>
      </div>
      <div class="detail-row">
        <span class="label">正股名称</span>
        <span class="value">${bd.stockName || "-"}</span>
      </div>
      <div class="detail-row">
        <span class="label">正股代码</span>
        <span class="value">${bd.stockCode || "-"}</span>
      </div>
      <div class="detail-row">
        <span class="label">信用评级</span>
        <span class="value">${bd.rating || "-"}</span>
      </div>
      <div class="detail-row">
        <span class="label">发行规模</span>
        <span class="value">${bd.issueAmount ? bd.issueAmount.toFixed(2) + " 亿" : "-"}</span>
      </div>
      <div class="detail-row">
        <span class="label">最新余额</span>
        <span class="value">${bd.latestAmount ? bd.latestAmount.toFixed(2) + " 亿" : "-"}</span>
      </div>
      <div class="detail-row">
        <span class="label">转股价</span>
        <span class="value">${bd.convertPrice ? bd.convertPrice.toFixed(2) + " 元" : "-"}</span>
      </div>
      <div class="detail-row">
        <span class="label">到期日期</span>
        <span class="value">${bd.maturityDate || "-"}</span>
      </div>
      <div class="detail-row" style="border-top: 2px solid #f1f5f9; margin-top: 8px; padding-top: 12px;">
        <span class="label">最新价格</span>
        <span class="value" style="color:${changeColor};font-weight:700;font-size:16px">
          ${bd.price !== null && bd.price !== undefined ? bd.price.toFixed(3) : "-"}
        </span>
      </div>
      <div class="detail-row">
        <span class="label">涨跌幅</span>
        <span class="value" style="color:${changeColor}">${changeStr}</span>
      </div>
      <div class="detail-row">
        <span class="label">所属行业</span>
        <span class="value">${displayL1} / ${displayL2}</span>
      </div>
      <div class="detail-row">
        <span class="label">所属板块</span>
        <span class="value" style="color:${sectorColor}">${displaySector}</span>
      </div>
      ${bd.tradeDate ? `<p class="hint" style="margin-top:12px;font-size:12px">数据日期: ${bd.tradeDate}</p>` : ""}
    </div>
  `;
}

/* ============================
 * 渲染板块节点详情
 * ============================ */
function renderSectorDetail(panel, node) {
  const sector = node.data?.name;
  const color = SECTOR_COLORS[sector] || "#3b82f6";
  const industries = SECTOR_MAPPING[sector] || [];

  // 统计各一级行业的二级数量
  const l2Counts = {};
  SW_INDUSTRY_DATA["二级行业"].forEach(l2 => {
    const l1 = l2["上级行业"];
    l2Counts[l1] = (l2Counts[l1] || 0) + 1;
  });

  // 统计该板块下的可转债总数
  let sectorBondCount = (bondIndexSector[sector] || []).length;

  panel.innerHTML = `
    <div class="panel-header" style="border-left-color: ${color}">
      <h3>${sector}</h3>
      <button class="close-btn" onclick="closePanel()">&times;</button>
    </div>
    <div class="panel-body">
      <div class="detail-row">
        <span class="label">节点类型</span>
        <span class="value">六大风格板块</span>
      </div>
      <div class="detail-row">
        <span class="label">一级行业数</span>
        <span class="value">${industries.length} 个</span>
      </div>
      ${sectorBondCount > 0 ? `<div class="detail-row"><span class="label">可转债数</span><span class="value" style="color:#3b82f6;font-weight:bold">${sectorBondCount} 只</span></div>` : ""}
      <div class="tag-list">
        ${industries.map(name => {
          const count = l2Counts[name] || 0;
          return `<span class="tag" title="含 ${count} 个二级行业">${name} (${count})</span>`;
        }).join("")}
      </div>
    </div>
  `;
}

/* ============================
 * 渲染非债券节点概要
 * ============================ */
function renderNodeSummary(panel, node) {
  const type = node.data?.type;
  const name = node.name;
  const childCount = countDescendants(node);

  let typeText = {
    "root": "根节点",
    "sector": "六大风格板块",
    "level1": "申万一级行业",
    "level2": "申万二级行业"
  }[type] || "未知";

  panel.innerHTML = `
    <div class="panel-header">
      <h3>${name}</h3>
      <button class="close-btn" onclick="closePanel()">&times;</button>
    </div>
    <div class="panel-body">
      <div class="detail-row">
        <span class="label">节点类型</span>
        <span class="value">${typeText}</span>
      </div>
      <div class="detail-row">
        <span class="label">下级节点数</span>
        <span class="value">${childCount}</span>
      </div>
    </div>
  `;
}

/* ============================
 * 统计后代节点数量
 * ============================ */
function countDescendants(node) {
  if (!node.children || node.children.length === 0) return 0;
  let count = node.children.length;
  node.children.forEach(child => { count += countDescendants(child); });
  return count;
}

/* ============================
 * 关闭详情面板
 * ============================ */
function closePanel() {
  document.getElementById("detail-panel").classList.remove("open");
  document.getElementById("main").classList.remove("panel-open");
  requestAnimationFrame(function() { chart.resize(); });
  // 取消高亮
  chart.dispatchAction({ type: "downplay", seriesIndex: 0 });
}

/* ============================
 * 展开全部 / 收起全部 / 重置
 * ============================ */
function expandAll() {
  if (!chart || !treeData) return;
  chart.setOption({ series: [{ data: [setAllCollapsed(treeData, false)] }] });
}

function collapseAll() {
  if (!chart || !treeData) return;
  chart.setOption({ series: [{ data: [setAllCollapsed(treeData, true)] }] });
}

function setAllCollapsed(node, collapsed) {
  const clone = { ...node };
  if (clone.children) {
    clone.children = clone.children.map(child => setAllCollapsed(child, collapsed));
  }
  if (clone.data?.type === "root" || clone.data?.type === "sector") {
    clone.collapsed = false;
  } else {
    clone.collapsed = collapsed;
  }
  return clone;
}

function resetView() {
  if (!chart) return;
  const wrapper = document.getElementById("chart-wrapper");
  const container = document.getElementById("chart-container");
  container.style.width = "100%";
  container.style.height = Math.max(wrapper.clientHeight, 2000) + "px";
  treeData = buildTreeData();
  chart.setOption(getChartOption(treeData));
  closePanel();
}

// 页面加载完成后初始化
// DOM 就绪后启动
(function() {
  function ready() {
    initChart();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready);
  } else {
    ready();
  }
})();
