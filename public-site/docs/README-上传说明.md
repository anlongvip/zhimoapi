# 文档站上传说明

## 上传到宝塔

1. 在宝塔打开网站 `docs.zhimomedia.com` 的文件目录。
2. 进入网站根目录，通常是 `/www/wwwroot/docs.zhimomedia.com`。
3. 上传本目录里的 `index.html` 和 `logo.svg`，放在根目录。
4. 浏览器打开 `https://docs.zhimomedia.com/` 检查页面。

如果目录中已经有同名文件，上传时选择覆盖。保留其他服务器配置文件不动。

## 更新内容

编辑 `index.html` 后，重新上传并覆盖服务器上的同名文件。Logo 文件单独替换时，也要保持文件名为 `logo.svg`。

GitHub 中的副本用于保存记录；提交到 GitHub 不会自动上传到宝塔服务器。
