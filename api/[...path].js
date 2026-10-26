const { createApplication } = require('../apps/api/dist/bootstrap');

let handlerPromise;

async function getHandler() {
  const app = await createApplication();
  await app.init();
  return app.getHttpAdapter().getInstance();
}

module.exports = async (request, response) => {
  handlerPromise ??= getHandler();
  return (await handlerPromise)(request, response);
};
