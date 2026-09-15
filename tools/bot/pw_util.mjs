// tools/bot/pw_util.mjs — Playwright page.evaluate 的逾時護欄。
//
// 頁內無限迴圈／renderer 卡死時，page.evaluate 可能永遠不 resolve（Playwright 的預設逾時
// 不套用在 evaluate 上），整個 worker 會靜默停擺。本模組把每次 evaluate 包成可逾時的 Promise。
//
// 對應 specs/bot-balance-sim：requirements.md R8、design.md「關鍵流程」批次調度段。

/**
 * @param {{evaluate:Function}} page Playwright page（測試以假物件替身）
 * @returns {Promise<*>} 逾時則 reject 一個 name 為 'EvaluateTimeout' 的 Error
 */
export function evaluateWithTimeout(page, fn, arg, ms) {
  return new Promise((resolve, reject) => {
    let timer = setTimeout(() => {
      timer = null;
      const err = new Error(`EvaluateTimeout: page.evaluate 超過 ${ms} ms 未回應`);
      err.name = 'EvaluateTimeout';
      reject(err);
    }, ms);
    const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
    // 先接上 handler 再讓它跑：逾時後原 evaluate 仍可能以「Target closed」reject，
    // 沒有 handler 會變成 unhandledRejection 直接殺掉整個批次程序。
    Promise.resolve()
      .then(() => page.evaluate(fn, arg))
      .then((v) => { clear(); resolve(v); }, (e) => { clear(); reject(e); });
  });
}
