# 智墨算力聚合平台：官网与文档素材

本目录集中保存网站对外展示内容，方便后续记录和修改。

## 目录内容

- [about.html](about.html)：粘贴到管理后台“站点与品牌 → 系统信息 → 关于”的 HTML 内容。
- [docs/index.html](docs/index.html)：中文静态文档站主页。
- [docs/logo.svg](docs/logo.svg)：文档站使用的 Logo。
- [docs/README-上传说明.md](docs/README-上传说明.md)：宝塔上传步骤。

## 发布文档站

把 `docs/` 里面的文件上传到宝塔网站根目录（例如 `/www/wwwroot/docs.zhimomedia.com`），然后访问：

`https://docs.zhimomedia.com/`

此目录是记录和部署用的静态文件，不会自动改变正在运行的网站。更新线上内容时，需要把修改后的文件重新上传到网站目录。
