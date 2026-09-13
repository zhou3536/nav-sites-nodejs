import http from 'node:http';
import assert from 'node:assert';

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- 开始接口与业务流程验证 ---');

  // 1. 未登录访问 /
  console.log('\n[测试 1] 未登录访问首页 / ...');
  const res1 = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/',
    method: 'GET'
  });
  console.log(`状态码: ${res1.statusCode} (预期 401)`);
  assert.strictEqual(res1.statusCode, 401, '未登录访问应返回 401');
  assert.ok(res1.body.includes('登录'), '未登录访问应输出登录页面');

  // 2. 错误密码登录
  console.log('\n[测试 2] 错误密码登录 POST /login ...');
  const res2 = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ username: 'admin', password: 'wrongpassword' }));
  console.log(`状态码: ${res2.statusCode} (预期 401)`);
  assert.strictEqual(res2.statusCode, 401, '错误密码应返回 401');

  // 3. 正确密码登录
  console.log('\n[测试 3] 正确密码登录 POST /login ...');
  const res3 = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, JSON.stringify({ username: 'admin', password: 'admin123' }));
  console.log(`状态码: ${res3.statusCode} (预期 200)`);
  assert.strictEqual(res3.statusCode, 200, '正确密码登录应返回 200');

  const setCookie = res3.headers['set-cookie'];
  assert.ok(setCookie && setCookie.length > 0, '登录成功必须包含 Set-Cookie');
  const authToken = setCookie[0].split(';')[0];
  console.log(`获得的 Cookie: ${authToken}`);

  // 4. 携带 Cookie 获取书签列表
  console.log('\n[测试 4] 携带 Cookie 获取 GET /bookmarks ...');
  const res4 = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/bookmarks',
    method: 'GET',
    headers: { 'Cookie': authToken }
  });
  console.log(`状态码: ${res4.statusCode} (预期 200)`);
  assert.strictEqual(res4.statusCode, 200, '获取书签应返回 200');
  const list = JSON.parse(res4.body);
  assert.ok(Array.isArray(list), '书签返回应为数组');
  console.log(`获取到书签数量: ${list.length}`);

  // 5. 添加新书签
  console.log('\n[测试 5] 添加新书签 POST /bookmarks ...');
  const res5 = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/bookmarks',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authToken
    }
  }, JSON.stringify({ name: 'Node.js 官网', url: 'https://nodejs.org' }));
  console.log(`状态码: ${res5.statusCode} (预期 201)`);
  assert.strictEqual(res5.statusCode, 201, '添加书签应返回 201');
  const newBm = JSON.parse(res5.body);
  console.log(`新书签详情: ID=${newBm.id}, Name=${newBm.name}, Icon=${newBm.icon}`);
  assert.strictEqual(newBm.name, 'Node.js 官网');

  // 6. 修改书签
  console.log('\n[测试 6] 修改书签 PUT /bookmarks ...');
  const res6 = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/bookmarks',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authToken
    }
  }, JSON.stringify({ id: newBm.id, name: 'Node.js 官方中文网', url: 'https://nodejs.org/zh-cn' }));
  console.log(`状态码: ${res6.statusCode} (预期 200)`);
  assert.strictEqual(res6.statusCode, 200, '修改书签应返回 200');
  const updatedBm = JSON.parse(res6.body);
  assert.strictEqual(updatedBm.name, 'Node.js 官方中文网');
  console.log(`修改后书签名称: ${updatedBm.name}, Icon=${updatedBm.icon}`);

  // 7. 测试排序 PUT /bookmarks (Array)
  console.log('\n[测试 7] 测试拖拽排序保存 PUT /bookmarks ...');
  const resAfterAdd = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/bookmarks',
    method: 'GET',
    headers: { 'Cookie': authToken }
  });
  const currentList = JSON.parse(resAfterAdd.body);
  // 将最后一个元素移到最前面
  const lastItem = currentList.pop();
  currentList.unshift(lastItem);
  const resSort = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/bookmarks',
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authToken
    }
  }, JSON.stringify(currentList));
  console.log(`状态码: ${resSort.statusCode} (预期 200)`);
  assert.strictEqual(resSort.statusCode, 200, '排序保存应返回 200');

  // 8. 删除刚才添加的测试书签
  console.log('\n[测试 8] 删除测试书签 DELETE /bookmarks?id=... ...');
  const res7 = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: `/bookmarks?id=${newBm.id}`,
    method: 'DELETE',
    headers: { 'Cookie': authToken }
  });
  console.log(`状态码: ${res7.statusCode} (预期 200)`);
  assert.strictEqual(res7.statusCode, 200, '删除书签应返回 200');

  // 9. 退出登录
  console.log('\n[测试 9] 退出登录 GET /logout ...');
  const res8 = await request({
    hostname: '127.0.0.1',
    port: 3000,
    path: '/logout',
    method: 'GET',
    headers: { 'Cookie': authToken }
  });
  console.log(`状态码: ${res8.statusCode} (预期 302 重定向到 /login)`);
  assert.strictEqual(res8.statusCode, 302, '退出登录应返回 302');
  assert.strictEqual(res8.headers['location'], '/login', '应重定向到 /login');

  console.log('\n🎉 所有自动化接口测试均 100% 通过！');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ 测试执行失败:', err);
  process.exit(1);
});
