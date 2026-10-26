// ═══════════════════════════════════════════════════════════════════════════
// home_net_banner_step.ts — «Нет сети» на Главной: имена Главной поверх общего правила app/net_offline_step.ts.
//
// зачем (владелец 26.10, «Нет сети» при живой сети; координатор — один помощник для Главной, каталога и очереди зовов): правило
// одно — connected=false сразу, reachable=false только 5 с подряд, null = сеть есть, возврат — сразу. Здесь только имена,
// которыми пользуются Главная и её тест.
// ═══════════════════════════════════════════════════════════════════════════
export {
  NET_UNREACHABLE_CONFIRM_MS as NET_BANNER_UNREACHABLE_MS,
  netOfflineStep as homeNetBannerStep,
  netOfflineInstant as homeSceneOfflineVerdict,
  type NetOfflineSnapshot as NetBannerSnapshot,
  type NetOfflineStep as NetBannerStep,
} from '../../../../app/net_offline_step';
