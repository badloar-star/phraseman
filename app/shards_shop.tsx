import { Redirect } from 'expo-router';

/** Старый URL магазина остаётся лишь для ссылок из прежних сборок. */
export default function RetiredShardsShopRoute() {
  return <Redirect href="/flashcards_my_packs" />;
}
