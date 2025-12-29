# 托福阅读冲刺诊断 (TOEFL Reading Sprint Diagnostic)

本项目已配置为支持 Streamlit 部署。

## 目录结构

*   `app.py`: Streamlit 应用入口文件，负责加载静态资源。
*   `static/`: 包含所有静态资源（HTML, CSS, JS, JSON）。
    *   **注意**: 所有的网页文件已迁移至 `static` 目录中。请在此目录下进行后续开发。
*   `requirements.txt`: 依赖文件。

## 本地运行

1.  安装依赖：
    ```bash
    pip install -r requirements.txt
    ```

2.  启动应用：
    ```bash
    streamlit run app.py
    ```

3.  应用将在浏览器中自动打开（默认地址：`http://localhost:8501`）。

## 部署到 Streamlit Cloud

1.  将本项目上传至 GitHub 仓库。
2.  登录 [Streamlit Cloud](https://streamlit.io/cloud)。
3.  点击 "New app"。
4.  选择你的 GitHub 仓库、分支，并指定主文件路径为 `app.py`。
5.  点击 "Deploy"。

## 注意事项

*   **静态文件路径**: Streamlit 默认将根目录下的 `static` 文件夹作为静态资源服务目录。在 `app.py` 中，我们通过 iframe 引用 `/app/static/index.html` 来加载应用。
*   **开发修改**: 如果需要修改页面内容，请直接编辑 `static/` 目录下的文件。
