// renderer/script/login.js
// 注意：新的登录页面已经将所有逻辑内嵌在HTML中
// 这个文件现在只是作为备用，主要逻辑在login.html的<script>标签内

import * as userManager from '../../modules/userManager.js';

console.log('[login.js] Login script loaded - but main logic is now in login.html');

// 如果你想保留这个文件作为备用或者将来迁移逻辑，可以使用以下代码：

export async function initializeLogin() {
    console.log('[login.js] Initializing login functionality');
    
    // 检查是否已经登录
    const existingUser = userManager.loadUser();
    if (existingUser) {
        console.log('[login.js] User already logged in, redirecting...');
        window.location.href = '../index.html';
        return;
    }
    
    // 其他初始化逻辑可以放在这里
}

// 导出用户管理函数以供其他地方使用
export { userManager };