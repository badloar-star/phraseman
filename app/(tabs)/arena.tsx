// зачем: D83 — клиентская Арена удалена целиком. Файл остаётся только как
// legacy-якорь URL `/arena`: старые ссылки маппятся на Главную в
// app/(tabs)/_layout.tsx (PATHNAME_TO_IDX / SEGMENT_TO_TAB_IDX), а
// (tabs)/_layout.tsx детей-роутов не рендерит. Без файла старый URL упал бы
// в not-found.
export default function ArenaLegacyAnchor() {
  return null;
}
