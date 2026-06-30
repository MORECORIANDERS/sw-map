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
 * 快速判断：转债是否已到期/退市
 * ============================ */
function isBondDefunct(bond) {
  if (bond.price === null || bond.price === undefined) return true;
  if (bond.maturityDate) {
    var now = new Date();
    var m = new Date(bond.maturityDate.replace(/-/g, "/"));
    if (m < now) return true;
  }
  return false;
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

    // 统计板块下总转债数
    var sectorBonds = (bondIndexSector[sector] || []).length;
    var sectorLabel = sectorBonds > 0 ? sector + "  (" + sectorBonds + "只)" : sector;

    const sectorNode = {
      name: sectorLabel,
      value: `sector-${slug(sector)}`,
      collapsed: false,
      data: { type: "sector", name: sector },
      itemStyle: { color: sectorColor, borderColor: sectorColor },
      label: { backgroundColor: sectorColor, color: "#fff", fontWeight: "bold", fontSize: 13 },
      symbolSize: 18,
      children: []
    };
    Object.entries(groups[sector]).forEach(([l1Name, l2List]) => {
      // 统计一级行业总转债数
      var l1Bonds = (bondIndexL1["l1|" + l1Name] || []).length;
      var l1Label = l1Bonds > 0 ? l1Name + "  (" + l1Bonds + "只)" : l1Name;

      // 一级节点：申万一级行业
      const l1Node = {
        name: l1Label,
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
        var bondsInL2 = bondIndex[l1Name + "|" + l2Name] || [];
        var l2Bonds = bondsInL2.length;
        var hasDefunct = bondsInL2.some(function(b) { return isBondDefunct(b); });
        var activeBonds = l2Bonds - (hasDefunct ? bondsInL2.filter(function(b) { return isBondDefunct(b); }).length : 0);
        var l2Label = l2Bonds > 0 ? l2Name + "  (" + l2Bonds + "只)" : l2Name;

        const l2Node = {
          name: l2Label,
          value: `l2-${slug(l1Name)}-${slug(l2Name)}`,
          collapsed: true,
          data: { type: "level2", name: l2Name, level1: l1Name },
          itemStyle: { color: "#e2e8f0", borderColor: "#cbd5e1" },
          label: { backgroundColor: "#e2e8f0", color: "#475569", fontSize: 11 },
          symbolSize: 6,
          children: []
        };

        // 挂载该二级行业下的可转债
        bondsInL2.forEach(function(bond) {
          var isDead = isBondDefunct(bond);
          var showPrice = !isDead && bond.price !== null && bond.price !== undefined && bond.changePct !== null;

          var displayName;
          if (isDead) {
            displayName = bond.bondName + "  (到期)";
          } else if (showPrice) {
            displayName = bond.bondName + "  " + bond.price.toFixed(2);
          } else {
            displayName = bond.bondName;
          }

          // 颜色：到期灰、涨红跌绿
          var labelColor, labelBg;
          if (isDead) {
            labelColor = "#94a3b8";
            labelBg = "rgba(248,250,252,0.85)";
          } else if (showPrice && bond.changePct >= 0) {
            labelColor = "#dc2626";
            labelBg = "rgba(254,242,242,0.9)";
          } else if (showPrice && bond.changePct < 0) {
            labelColor = "#16a34a";
            labelBg = "rgba(240,253,244,0.9)";
          } else {
            labelColor = "#334155";
            labelBg = "rgba(255,255,255,0.85)";
          }

          l2Node.children.push({
            name: displayName,
            value: "bond-" + bond.bondCode,
            data: { type: "bond", bondCode: bond.bondCode },
            itemStyle: {
              color: isDead ? "#f8fafc" : "#ffffff",
              borderColor: isDead ? "#cbd5e1" : (showPrice ? (bond.changePct >= 0 ? "#fca5a5" : "#86efac") : "#94a3b8")
            },
            label: {
              backgroundColor: labelBg,
              color: labelColor,
              fontSize: 14,
              fontWeight: isDead ? "normal" : "normal",
              fontStyle: isDead ? "italic" : "normal",
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
  try {
    log('initChart 开始');
  const wrapper = document.getElementById("chart-wrapper");
  const container = document.getElementById("chart-container");

  if (!container) { log('❌ chart-container 不存在'); return; }
  if (typeof echarts === 'undefined') { log('❌ ECharts 未加载'); return; }

  // 动态计算画布高度：按节点数量估算
  var totalBonds = 0;
  if (typeof BOND_DETAIL_MAP !== "undefined") {
    totalBonds = Object.keys(BOND_DETAIL_MAP).length;
  }
  log('BOND_DETAIL_MAP keys: ' + totalBonds);
  if (totalBonds === 0) { log('⚠️ 债券数据为空，可能数据尚未加载'); }

  // 每个 bond 节点约 26px，加上各级中间节点（约总节点数的 40%）
  var estNodes = totalBonds * 1.4;
  var dynamicHeight = Math.max(wrapper.clientHeight, estNodes * 26, 2000);

  container.style.width = "100%";
  container.style.height = dynamicHeight + "px";

  if (typeof echarts === 'undefined') {
    log('❌ echarts.init 无法执行');
    return;
  }
  chart = echarts.init(container);
  log('ECharts init 成功');

  buildBondIndex();
  log('bondIndex 构建完成');

  treeData = buildTreeData();
  const option = getChartOption(treeData);
  chart.setOption(option);

  chart.on("click", handleNodeClick);
  window.addEventListener("resize", function() { chart.resize(); });

  // 显示数据日期
  showDataInfo();
  // 初始化搜索
    initSearch();
  } catch(e) {
    log('❌ initChart 异常: ' + (e.message || e));
    if (infoEl) infoEl.textContent = '❌ 加载错误: ' + (e.message || '未知错误');
  }
  log('initChart 完成');
}

/* ============================
 * 显示数据日期
 * ============================ */
function showDataInfo() {
  var el = document.getElementById("dataInfo");
  if (!el) return;
  if (typeof BOND_DETAIL_MAP === "undefined") { el.textContent = "无数据"; return; }

  var dates = [];
  Object.values(BOND_DETAIL_MAP).forEach(function(b) {
    if (b.tradeDate) dates.push(b.tradeDate);
  });
  if (dates.length === 0) { el.textContent = "数据日期未知"; return; }

  dates.sort().reverse();
  var latest = dates[0];
  var count = Object.keys(BOND_DETAIL_MAP).length;
  el.textContent = "数据: " + latest + "  |  " + count + " 只";
}

/* ============================
 * 搜索功能
 * ============================ */
var SEARCH_SELECTED_INDEX = -1;

function initSearch() {
  var input = document.getElementById("searchInput");
  var dropdown = document.getElementById("searchDropdown");
  if (!input || !dropdown) return;

  // 输入时搜索
  input.addEventListener("input", function() {
    var q = input.value.trim();
    if (q.length < 1) {
      dropdown.classList.remove("show");
      return;
    }
    var matches = doSearch(q);
    renderSearchDropdown(matches, q);
    SEARCH_SELECTED_INDEX = -1;
  });

  // 失焦关闭（延迟让点击事件先触发）
  input.addEventListener("blur", function() {
    setTimeout(function() { dropdown.classList.remove("show"); }, 200);
  });

  // 聚焦时如果有结果重新显示
  input.addEventListener("focus", function() {
    if (input.value.trim().length >= 1) {
      var matches = doSearch(input.value.trim());
      if (matches.length > 0) renderSearchDropdown(matches, input.value.trim());
    }
  });

  // 键盘上下选择 + Enter 确认
  input.addEventListener("keydown", function(e) {
    var items = dropdown.querySelectorAll(".search-item");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      SEARCH_SELECTED_INDEX = Math.min(SEARCH_SELECTED_INDEX + 1, items.length - 1);
      updateSearchHighlight(items);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      SEARCH_SELECTED_INDEX = Math.max(SEARCH_SELECTED_INDEX - 1, 0);
      updateSearchHighlight(items);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (SEARCH_SELECTED_INDEX >= 0 && SEARCH_SELECTED_INDEX < items.length) {
        var bc = items[SEARCH_SELECTED_INDEX].getAttribute("data-bond");
        if (bc) { dropdown.classList.remove("show"); onSearchSelect(bc); }
      } else if (items.length > 0) {
        var bc2 = items[0].getAttribute("data-bond");
        if (bc2) { dropdown.classList.remove("show"); onSearchSelect(bc2); }
      }
    } else if (e.key === "Escape") {
      dropdown.classList.remove("show");
    }
  });
}

function updateSearchHighlight(items) {
  items.forEach(function(el, i) {
    el.classList.toggle("active", i === SEARCH_SELECTED_INDEX);
  });
  // 滚动到可见
  if (SEARCH_SELECTED_INDEX >= 0 && items[SEARCH_SELECTED_INDEX]) {
    items[SEARCH_SELECTED_INDEX].scrollIntoView({ block: "nearest" });
  }
}

function doSearch(query) {
  var q = query.toLowerCase();
  var results = [];
  if (typeof BOND_DETAIL_MAP === "undefined") return results;

  Object.values(BOND_DETAIL_MAP).forEach(function(b) {
    var score = 0;
    // 转债代码精确匹配优先
    if (b.bondCode && b.bondCode.indexOf(q) !== -1) {
      score = b.bondCode === q ? 100 : 80;
    }
    // 转债名称
    if (b.bondName && b.bondName.toLowerCase().indexOf(q) !== -1) {
      score = Math.max(score, b.bondName.toLowerCase() === q ? 90 : 60);
    }
    // 正股名称
    if (b.stockName && b.stockName.toLowerCase().indexOf(q) !== -1) {
      score = Math.max(score, b.stockName.toLowerCase() === q ? 85 : 50);
    }
    // 正股代码
    if (b.stockCode && b.stockCode.indexOf(q) !== -1) {
      score = Math.max(score, b.stockCode === q ? 95 : 70);
    }
    if (score > 0) {
      results.push({ bond: b, score: score });
    }
  });

  results.sort(function(a, b) { return b.score - a.score; });
  return results.slice(0, 20);
}

function renderSearchDropdown(matches, query) {
  var dropdown = document.getElementById("searchDropdown");
  if (!dropdown) return;

  if (matches.length === 0) {
    dropdown.innerHTML =
      '<div class="search-empty">未匹配到"' + escHtml(query) + '"<div class="hint-text">试试搜转债名、代码或正股名</div></div>';
    dropdown.classList.add("show");
    return;
  }

  var html = "";
  matches.forEach(function(m) {
    var b = m.bond;
    var ind = lookupBondIndustry(b);
    var industryPath = ind ? (findSectorByLevel1(ind.l1) || "") + " / " + ind.l1 : b.industryLevel1 || "";
    html +=
      '<div class="search-item" data-bond="' + b.bondCode + '">' +
        '<span><span class="si-name">' + escHtml(b.bondName) + '</span>' +
        '<span class="si-code">' + b.bondCode + '</span></span>' +
        '<span class="si-industry">' + escHtml(industryPath) + '</span>' +
      '</div>';
  });

  dropdown.innerHTML = html;
  dropdown.classList.add("show");

  // 绑定点击事件
  var items = dropdown.querySelectorAll(".search-item");
  items.forEach(function(el) {
    el.addEventListener("mousedown", function(e) {
      e.preventDefault();
      var bc = this.getAttribute("data-bond");
      dropdown.classList.remove("show");
      if (bc) onSearchSelect(bc);
    });
  });
}

function escHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ============================
 * 搜索选中某转债 → 展开路径 + 高亮
 * ============================ */
function onSearchSelect(bondCode) {
  var bd = typeof BOND_DETAIL_MAP !== "undefined" ? BOND_DETAIL_MAP[bondCode] : null;
  if (!bd) return;

  // 获取行业路径
  var ind = lookupBondIndustry(bd);
  if (!ind) { handleNodeClick({ data: { data: { type: "bond", bondCode: bondCode } } }); return; }

  var sector = findSectorByLevel1(ind.l1);
  if (!sector) { handleNodeClick({ data: { data: { type: "bond", bondCode: bondCode } } }); return; }

  // 构建完整的展开树：只展开目标路径
  var expandedTree = buildExpandedTree(treeData, sector, ind.l1, ind.l2, bondCode);
  if (!expandedTree) return;

  chart.setOption({ series: [{ data: [expandedTree] }] }, { notMerge: false });

  // 高亮目标节点
  setTimeout(function() {
    chart.dispatchAction({ type: "downplay", seriesIndex: 0 });
    chart.dispatchAction({
      type: "highlight",
      seriesIndex: 0,
      name: findBondNodeName(bd)
    });
    // 触发详情面板
    handleNodeClick({ data: { data: { type: "bond", bondCode: bondCode } } });
  }, 350);
}

function findBondNodeName(bd) {
  var isDead = isBondDefunct(bd);
  var showPrice = !isDead && bd.price !== null && bd.changePct !== null;
  if (isDead) return bd.bondName + "  (到期)";
  if (showPrice) return bd.bondName + "  " + bd.price.toFixed(2);
  return bd.bondName;
}

function buildExpandedTree(originalTree, sector, l1Name, l2Name, bondCode) {
  if (!originalTree) return null;
  var clone = JSON.parse(JSON.stringify(originalTree));

  // 找到板块
  var sectorNode = (clone.children || []).find(function(c) {
    return c.data && c.data.type === "sector" && c.data.name === sector;
  });
  if (!sectorNode) return null;
  sectorNode.collapsed = false;

  // 找到一级行业
  var l1Node = (sectorNode.children || []).find(function(c) {
    return c.data && c.data.type === "level1" && c.data.name === l1Name;
  });
  if (!l1Node) return null;
  l1Node.collapsed = false;

  // 找到二级行业
  var l2Node = (l1Node.children || []).find(function(c) {
    return c.data && c.data.type === "level2" && c.data.name === l2Name;
  });
  if (!l2Node) return null;
  l2Node.collapsed = false;

  // 找到转债节点，标记高亮信息
  var bondNode = (l2Node.children || []).find(function(c) {
    return c.data && c.data.data && c.data.data.type === "bond" && c.data.data.bondCode === bondCode;
  });
  if (bondNode) {
    // 加粗加亮边框
    bondNode.itemStyle = bondNode.itemStyle || {};
    bondNode.itemStyle.borderColor = "#3b82f6";
    bondNode.itemStyle.borderWidth = 2;
    bondNode.itemStyle.shadowBlur = 6;
    bondNode.itemStyle.shadowColor = "rgba(59,130,246,0.3)";
  }

  return clone;
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
            var isDead = isBondDefunct(bd);
            var changeStr = bd.changePct !== null
              ? (bd.changePct >= 0 ? "+" : "") + bd.changePct.toFixed(2) + "%"
              : "-";
            var priceStr = (bd.price !== null && bd.price !== undefined) ? bd.price.toFixed(3) : "已到期/退市";
            var ind = lookupBondIndustry(bd);
            var pathStr = ind ? (findSectorByLevel1(ind.l1) || "") + " → " + ind.l1 + " → " + ind.l2 : (bd.industryLevel1 || "-");

            if (isDead) {
              return "<b>" + bd.bondName + "</b><br/>" +
                     "转债代码: " + bd.bondCode + "<br/>" +
                     "评级: " + (bd.rating || "-") + "<br/>" +
                     "到期日期: " + (bd.maturityDate || "-") + "<br/>" +
                     "⚠ 已到期/退市<br/>" +
                     "<hr style='margin:4px 0;border:none;border-top:1px solid #e2e8f0'/>" +
                     "<span style='color:#94a3b8;font-size:11px'>" + pathStr + "</span>";
            }

            return "<b>" + bd.bondName + "</b><br/>" +
                   "转债代码: " + bd.bondCode + "<br/>" +
                   "正股: " + (bd.stockName || "-") + "<br/>" +
                   "评级: " + (bd.rating || "-") + "<br/>" +
                   "价格: " + priceStr + " (<span style='color:" + (bd.changePct >= 0 ? "#ef4444" : "#10b981") + "'>" + changeStr + "</span>)<br/>" +
                   "规模: " + (bd.latestAmount ? bd.latestAmount.toFixed(2) + "亿" : "-") + "<br/>" +
                   "<hr style='margin:4px 0;border:none;border-top:1px solid #e2e8f0'/>" +
                   "<span style='color:#64748b;font-size:11px'>" + pathStr + "</span>";
          }
          return "<b>" + node.name + "</b><br/>可转债";
        }
        if (type === "level1") {
          var l1Bonds = (bondIndexL1["l1|" + node.data?.name] || []).length;
          return "<b>" + node.name + "</b><br/>申万一级行业" +
                 (l1Bonds > 0 ? "<br/><span style='color:#3b82f6'>含 " + l1Bonds + " 只可转债</span>" : "");
        }
        if (type === "level2") {
          var l1 = node.data?.level1 || "";
          var key = l1 + "|" + node.data?.name;
          var l2Bonds = (bondIndex[key] || []).length;
          return "<b>" + node.name + "</b><br/>申万二级行业" +
                 (l2Bonds > 0 ? "<br/><span style='color:#3b82f6'>含 " + l2Bonds + " 只可转债</span>" : "");
        }
        if (type === "sector") {
          var sb = (bondIndexSector[node.data?.name] || []).length;
          return "<b>" + node.name + "</b><br/>六大风格板块" +
                 (sb > 0 ? "<br/><span style='color:#3b82f6'>含 " + sb + " 只可转债</span>" : "");
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
  const name = node.data?.name || node.name.replace(/\s+\(\d+只\)$/, "");
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

  var isDead = isBondDefunct(bd);

  // 通过正股代码获取准确行业分类
  const ind = lookupBondIndustry(bd);
  const displayL1 = ind ? ind.l1 : (bd.industryLevel1 || "-");
  const displayL2 = ind ? ind.l2 : (bd.industryLevel2 || "-");
  const displaySector = ind ? (findSectorByLevel1(ind.l1) || bd.sector || "-") : (bd.sector || "-");
  const sectorColor = SECTOR_COLORS[displaySector] || "#3b82f6";

  var changeColor = isDead ? "#94a3b8" : (bd.changePct !== null ? (bd.changePct >= 0 ? "#ef4444" : "#10b981") : "#64748b");
  var changeSign = bd.changePct !== null ? (bd.changePct >= 0 ? "+" : "") : "";
  var changeStr = bd.changePct !== null ? changeSign + bd.changePct.toFixed(2) + "%" : "-";
  var priceStr = (bd.price !== null && bd.price !== undefined) ? bd.price.toFixed(3) : "已到期/退市";

  panel.innerHTML = `
    <div class="panel-header" style="border-left-color: ${sectorColor}">
      <h3>${bd.bondName}${isDead ? ' <span style="color:#94a3b8;font-size:12px;font-weight:normal">(到期)</span>' : ""}</h3>
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
      ${isDead ? `<div class="detail-row"><span class="label">状态</span><span class="value" style="color:#94a3b8">已到期/退市</span></div>` : ""}
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
        <span class="value" style="color:${changeColor};font-weight:700;font-size:16px">${priceStr}</span>
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
  const name = node.data?.name || node.name.replace(/\s+\(\d+只\)$/, "");
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

  var totalBonds = 0;
  if (typeof BOND_DETAIL_MAP !== "undefined") totalBonds = Object.keys(BOND_DETAIL_MAP).length;
  var estNodes = totalBonds * 1.4;
  var dynamicHeight = Math.max(wrapper.clientHeight, estNodes * 26, 2000);
  container.style.height = dynamicHeight + "px";

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
