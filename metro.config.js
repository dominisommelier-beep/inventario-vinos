const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// El SDK de Anthropic trae dos versiones. La versión "ESM" tiene importaciones
// circulares que fallan al cargar en React Native, así que usamos la versión
// CommonJS, que es la misma que usa Node.js.
const resolverOriginal = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolver = resolverOriginal ?? context.resolveRequest;
  if (moduleName === '@anthropic-ai/sdk' || moduleName.startsWith('@anthropic-ai/sdk/')) {
    return resolver({ ...context, unstable_conditionNames: ['require', 'react-native', 'default'] }, moduleName, platform);
  }
  return resolver(context, moduleName, platform);
};

module.exports = config;
