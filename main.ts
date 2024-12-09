import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import dotenv from 'dotenv';
import noblox from 'noblox.js';

dotenv.config();

const app = new Koa();
const router = new Router();

async function initializeNoblox() {
  try {
    await noblox.setCookie(process.env.ROBLOX_COOKIE as string);
    const currentUser = await noblox.getAuthenticatedUser();
    console.log(`Logged in as ${currentUser.name}`);
  } catch (error) {
    console.error('Failed to initialize noblox.js:', error);
  }
}
initializeNoblox();

const apiKeyMiddleware = async (ctx: Koa.Context, next: Koa.Next) => {
  const apiKey = ctx.headers['x-api-key'];
  if (apiKey === process.env.API_KEY) {
    await next();
  } else {
    ctx.status = 403;
    ctx.body = { error: 'Forbidden: Invalid API Key' };
  }
};

interface PromoteRequestBody {
    userIds: number[];
  }

router.post('/promote', apiKeyMiddleware, async (ctx) => {
  const { userIds } = ctx.request.body as PromoteRequestBody;

  if (!userIds || !Array.isArray(userIds)) {
    ctx.status = 400;
    ctx.body = { error: 'Bad Request: userIds must be an array of numbers' };
    return;
  }

  try {
    const groupId = Number(process.env.GROUP_ID);

    const promotionResults = await Promise.all(
      userIds.map(async (userId) => {
        try {
          await noblox.promote(groupId, userId);
          return { userId, status: 'Promoted' };
        } catch (error) {
          console.error(`Failed to promote user ${userId}:`, error);
          return { userId, status: 'Failed', error: error.message };
        }
      })
    );

    ctx.status = 200;
    ctx.body = { message: 'Promotion results', results: promotionResults };
  } catch (error) {
    console.error('Error promoting users:', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal Server Error' };
  }
});

app.use(bodyParser());
app.use(router.routes()).use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
