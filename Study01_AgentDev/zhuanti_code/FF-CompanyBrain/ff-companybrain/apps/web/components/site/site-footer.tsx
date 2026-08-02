import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap wrap-wide">
        <div className="site-footer-top">
          <div className="site-footer-brand">
            <Logo />
            <p>
              企业知识中台。把散落的知识，变成员工随时能问、答案带依据、管理员管得住的可信资产。
            </p>
          </div>
          <div className="site-footer-cols">
            <div>
              <h5>前台 · 业务消费</h5>
              <Link href="/app">问公司大脑</Link>
              <Link href="/app/knowledge">知识空间</Link>
              <Link href="/app/settings">我的设置</Link>
            </div>
            <div>
              <h5>后台 · 知识库管理</h5>
              <Link href="/admin">知识库</Link>
              <Link href="/admin/new">新建知识库</Link>
              <Link href="/admin/diagnostics">运行与诊断</Link>
            </div>
            <div>
              <h5>方案</h5>
              <a href="#scenarios">个人知识库</a>
              <a href="#scenarios">关系知识库</a>
              <a href="#scenarios">文档资料库</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
