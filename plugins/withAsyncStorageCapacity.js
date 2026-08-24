const { withGradleProperties } = require('@expo/config-plugins');

const ASYNC_STORAGE_CAPACITY_KEY = 'AsyncStorage_db_size_in_MB';
const ASYNC_STORAGE_CAPACITY_MB = '64';

function upsertAsyncStorageCapacity(items) {
  let inserted = false;
  const nextItems = [];

  for (const item of items) {
    if (item.type === 'property' && item.key === ASYNC_STORAGE_CAPACITY_KEY) {
      if (!inserted) {
        nextItems.push({
          type: 'property',
          key: ASYNC_STORAGE_CAPACITY_KEY,
          value: ASYNC_STORAGE_CAPACITY_MB,
        });
        inserted = true;
      }
      continue;
    }
    nextItems.push(item);
  }

  if (!inserted) {
    nextItems.push({
      type: 'property',
      key: ASYNC_STORAGE_CAPACITY_KEY,
      value: ASYNC_STORAGE_CAPACITY_MB,
    });
  }

  return nextItems;
}

/** @param {import('@expo/config').ExpoConfig} config */
module.exports = function withAsyncStorageCapacity(config) {
  return withGradleProperties(config, (mod) => {
    mod.modResults = upsertAsyncStorageCapacity(mod.modResults);
    return mod;
  });
};

module.exports.upsertAsyncStorageCapacity = upsertAsyncStorageCapacity;
module.exports.ASYNC_STORAGE_CAPACITY_KEY = ASYNC_STORAGE_CAPACITY_KEY;
module.exports.ASYNC_STORAGE_CAPACITY_MB = ASYNC_STORAGE_CAPACITY_MB;
