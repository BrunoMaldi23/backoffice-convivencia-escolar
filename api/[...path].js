const { createApplication } = require('../apps/api/dist/bootstrap');

let handlerPromise;

async function getHandler() {
  const app = await createApplication();
  await app.init();
  return app.getHttpAdapter().getInstance();
}

module.exports = async (request, response) => {
  try {
    handlerPromise ??= getHandler();
    return (await handlerPromise)(request, response);
  } catch (error) {
    console.error('No se pudo iniciar la API.', error);
    response.statusCode = 500;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ status: 'error', message: 'No se pudo iniciar la API.' }));
  }
};
