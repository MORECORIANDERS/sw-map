/**
 * API 配置 - 可转债行业思维导图
 */
var API_CONFIG = {
  baseUrl: 'https://python12-9guk780v324f024d.service.tcloudbase.com/api-bridge',
  baseUrlAlt: 'https://extracilantro.cn/api-bridge',
  token: 'scbe2024',
  dataPath: '/api/sw-map-data',
};

// 调试日志（全局可用）
var DBG = { msgs: [] };
DBG.log = function(msg) {
  DBG.msgs.push('[' + new Date().toLocaleTimeString() + '] ' + msg);
  var el = document.getElementById('dbg-panel');
  if (el) el.textContent = DBG.msgs.join('\n');
};
var log = DBG.log; // 全局别名
log('API config loaded');
