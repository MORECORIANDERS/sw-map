/**
 * API 配置 - 可转债行业思维导图
 * 数据源：CloudBase api-bridge 云函数
 * 使用 CloudBase 默认域名（全球可解析），避免 DNS 问题
 */
var API_CONFIG = {
  // 主 API：CloudBase 默认域名（100% 可达）
  baseUrl: 'https://python12-9guk780v324f024d.service.tcloudbase.com/api-bridge',
  // 备用域名（用于已部署的自定义域名环境）
  baseUrlAlt: 'https://extracilantro.cn/api-bridge',
  token: 'scbe2024',
  dataPath: '/api/sw-map-data',
};
