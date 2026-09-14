<h1 align="center">FileWorker</h1>

FileWorker 是一个轻量级的文件管理和在线剪贴板，基于 Cloudflare Pages 和 R2。

## ✏️部署

### 当前 Cloudflare Pages 部署

本仓库的 `wrangler.jsonc` 对应 `fileworker` Pages 项目，使用
`BUCKET_BINDING` 直接连接现有的 `fileworker-store` R2 存储桶。
此配置无需 S3 Access Key；`PASSWORD` 继续使用 Pages 生产环境中保存的 Secret，
不要将密码写入代码或配置文件。其他 S3 部署仍可使用下方的环境变量配置。

```sh
npm ci
npm run build
npm run deploy -- --project-name fileworker
```

本地测试：在不提交的 `.dev.vars` 中设置 `PASSWORD=本地测试密码`，运行
`npm run preview -- --port 8794`。本地 R2 使用模拟存储，不修改生产文件。
运行 `npm run test:smoke` 可验证上传、下载、列表分页、访问控制、元数据更新和删除；
测试默认访问 `http://127.0.0.1:8794`，可通过 `FILEWORKER_URL` 修改地址。
通过 `FILEWORKER_PASSWORD` 或 `FILEWORKER_PASSWORD_FILE` 提供测试密码。
测试只创建并删除随机 `codex-smoke-` 前缀的测试文件。

当前 Pages 项目使用 Direct Upload。重新部署使用上述命令；修改 GitHub 仓库
不会自动发布，除非另外配置 CI。

### 原版 Git / S3 部署方式

更新无需重新部署，在 fork 的仓库里同步上游即可，cloudflare 会自动更新。

1. Fork 本仓库
2. 部署 Pages

   Cloudflare DashBoard -> Workers & Pages -> Create application -> Pages ->

   Connect to Git -> 选择 Fork 的仓库 ->

   设置 `Build command`: `npm run build`

   设置 `Build output directory`: `dist`

   点击 `Save and Deploy`

3. 创建 R2 存储桶

   Cloudflare DashBoard -> R2 -> Create Bucket
   记住创建的桶名，后面环境变量处会使用

5. 获取 R2 存储桶的信息

   Cloudflare DashBoard -> R2 -> Manage R2 API Tokens -> Create API token

   选择 Object Read & Write 或者 Admin Read & Write。

   创建后记录 `Access Key ID`、`Secret Access Key`。
   以及存储桶的`Endpoint`（格式为：`https://{account_id}.r2.cloudflarestorage.com`）

   这些信息不会再次显示。

6. 设置环境变量

   Cloudflare DashBoard -> {Your Worker} -> Settings -> Environment Variables -> (Production)Add variables

   添加以下环境变量：

   1. S3 地区，对于 R2 存储桶可以直接设置为 `auto`

      > REGION=auto

   2. 存储桶名称，这里不是固定的，是上一步中创建存储桶的桶名

      > BUCKET=store

   3. 存储桶的 Endpoint

      > ENDPOINT=https://{account_id}.r2.cloudflarestorage.com

   4. Access Key ID

      > ACCESS_KEY_ID=31415926535897932384626433832795

   5. Secret Access Key

      > SECRET_ACCESS_KEY=3141592653589793238462643383279502884197169399375105820974944592

   6. 访问密码（自己设置）
      > PASSWORD=123456

7. 重新部署

   Cloudflare DashBoard -> {Your Worker} -> Deployments -> All deployments -> Retry deployment

## 💡使用

![index](README/index.png)

![clip](README/clip.png)

![file](README/file.png)

![manage](README/manage.png)

## 🎉赞助

CDN acceleration and security protection for this project are sponsored by [Tencent EdgeOne](https://edgeone.ai/?from=github).

![edgeone](https://edgeone.ai/media/34fe3a45-492d-4ea4-ae5d-ea1087ca7b4b.png)
