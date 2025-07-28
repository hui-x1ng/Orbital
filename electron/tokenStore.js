let token = null;
let username = null;

module.exports = {
    setToken: (val) => { token = val; },
    getToken: () => token,
    clearToken: () => { 
        token = null; 
        username = null;
    },
    setUsername: (val) => { username = val; },
    getUsername: () => username,
};