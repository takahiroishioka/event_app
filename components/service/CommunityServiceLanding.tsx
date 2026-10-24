import Link from "next/link";
import { ArrowDown, ArrowRight, CalendarDays, Check, FileText, History, Layers, MessageCircle, Network, Share2, Sparkles, Upload, Users } from "lucide-react";
import { serviceConfig as config } from "@/lib/service/config";
import Reveal from "./Reveal";
import s from "./service.module.css";
export type WorkExample = { id: string; image_url: string; alt_text: string; link_url: string; placement: string };
const yen = (amount: number) => amount.toLocaleString("ja-JP");
const features = [
  { icon: FileText, title: "請求書の自動発行", status: "対応機能", text: "請求書を自動発行。発行の手間を減らし、イベント運営とあわせて請求業務をスムーズに進められます。" },
  { icon: CalendarDays, title: "イベント管理", status: "既存機能", text: "イベントの作成・公開から申込受付、参加者管理まで。繰り返す開催の準備を、一つの管理画面に。" },
  { icon: History, title: "参加履歴の管理", status: "既存機能", text: "アカウントごとの申込・参加情報を記録。参加者はマイページからイベントを確認できます。" },
  { icon: Upload, title: "成果物の投稿", status: "個別開発", text: "音声投稿の仕組みをベースに、作品や活動報告の投稿を設計。一般ファイルの投稿や開催イベントとの紐づけは追加開発で対応します。" },
  { icon: MessageCircle, title: "コミュニティ内タイムライン", status: "既存機能＋個別開発", text: "音声投稿の一覧、いいね・コメントは既存機能。コミュニティごとに独立したタイムラインや閲覧範囲は、個別に設計します。" },
  { icon: Share2, title: "外部SNSへの共有", status: "既存機能＋個別開発", text: "投稿ページの共有リンクをコピーして外部SNSへ。成果を伝えるシェア画像や投稿文の生成は、ご希望に合わせた追加開発です。" },
  { icon: ArrowRight, title: "次回イベントへの導線", status: "個別開発", text: "成果や過去イベントから、次の参加へ。既存のイベント一覧を活かし、関連する次回開催へつなぐ導線を設計します。" },
];
const faqs = [
  ["小規模なコミュニティでも利用できますか？", "小規模な勉強会を継続して開催する方を中心に想定しています。必要な機能を一緒に整理し、活動に合う構成をご相談いただけます。"],
  ["ITに詳しくなくても運営できますか？", "既存アプリには、イベント情報や画像を更新する管理画面があります。日々の運営で必要な操作を確認しながら、制作内容を決めていきます。"],
  ["今使っているSNSと併用できますか？", "はい。既存の投稿ページには共有リンクのコピー機能があります。XやInstagram、LINEを使いながら、活動の記録をアプリに残す運用を目指します。"],
  ["参加者ごとにアカウントを作れますか？", "はい。ユーザー登録・ログイン、マイページ、プロフィール、本人の投稿を管理する機能があります。"],
  ["コミュニティごとに投稿を分けられますか？", "ご希望に合わせて個別に設計します。現在の音声タイムラインには、複数コミュニティの投稿を独立して管理する機能はありません。閲覧権限を含めて追加開発の内容を相談します。"],
  ["どのようなイベントに向いていますか？", "定期的な勉強会、セミナー、作品をつくるワークショップ、交流会など。開催後の学びやアウトプットを、次の活動につなげたい場に向いています。"],
];
function Contact({ children }: { children: React.ReactNode }) {
  return <a className={s.cta} href={config.contactUrl} target="_blank" rel="noopener noreferrer">{children}<ArrowRight size={18} aria-hidden="true" /></a>;
}
function Examples({ items }: { items: WorkExample[] }) {
  return <div className={s.examples}>{items.map((item) => <a key={item.id} href={item.link_url} target="_blank" rel="noopener noreferrer" className={s.example}>
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={item.image_url} alt={item.alt_text} loading="lazy" width={800} height={450} /><span>{item.alt_text}<ArrowRight size={18} aria-hidden="true" /></span>
  </a>)}</div>;
}
export default function CommunityServiceLanding({ works, snsExamples }: { works: WorkExample[]; snsExamples: WorkExample[] }) {
  return <main className={s.page}>
    <header className={s.header}><Link href="/" className={s.brand}><Network size={24} aria-hidden="true" />しお缶<span>COMMUNITY DESIGN</span></Link><nav aria-label="サービス案内"><a href="#features">機能</a><a href="#pricing">料金</a><a href="#contact" className={s.navCta}>相談する</a></nav></header>
    <section className={`${s.container} ${s.hero}`}><div><p className={s.eyebrow}>EVENT × COMMUNITY</p><h1>夢に必要なのは、<br /><span>コミュニティだ。</span></h1><h2>そのコミュニティを、もっと強く。</h2><p className={s.lead}>イベント管理と成果共有を一つにする、<br />新しいコミュニティ運営の形。</p><div className={s.actions}><Contact>サービスについて相談する</Contact><a href="#features" className={s.secondary}>機能を詳しく見る<ArrowDown size={16} aria-hidden="true" /></a></div><p className={s.heroNote}>定期勉強会・セミナー・小さなコミュニティのために</p></div><div className={s.network} aria-label="イベント、参加履歴、成果、交流をつなぐ構想図"><div className={s.orbit} /><div className={s.hub}><Network size={35} aria-hidden="true" /><strong>あなたの<br />コミュニティ</strong><span>活動が、ここにつながる。</span></div>{[{icon:CalendarDays,label:"イベント"},{icon:History,label:"参加履歴"},{icon:Layers,label:"成果の共有"},{icon:Users,label:"交流"}].map(({icon:Icon,label},i) => <div key={label} className={`${s.node} ${s[`node${i}`]}`}><Icon size={23} aria-hidden="true" /><span>{label}</span></div>)}<p className={s.diagramCaption}>目指すコミュニティ体験のイメージ</p></div></section>
    <section className={s.manifesto}><div className={s.container}><p className={s.eyebrow}>BEYOND THE EVENT</p><h2>イベントを、<br className={s.mobileBreak} />開催して終わりにしない。</h2><p>申込から参加、成果の共有、交流、次のイベントまで。<br />コミュニティの活動を一つの場所につなぐ、イベント管理 × 小さなSNS。</p><p className={s.quiet}>大きくすることだけが、目的ではありません。<br />今いる人が活動しやすく、関係が深まり、成果が積み重なる。<br />夢を実現する力を、日々の活動の中に育てていきます。</p></div></section>
    <Reveal><section className={`${s.container} ${s.section}`}><p className={s.eyebrow}>THE DISTANCE</p><h2>開催するたびに、<br />情報がバラバラになっていませんか？</h2><div className={s.problems}>{[["申込","Googleフォーム / Peatix"],["交流","LINEオープンチャット"],["成果の発信","X / Instagram"],["次回案内","別のLP"],["参加履歴","Excel"]].map(([label,text]) => <div key={label}><span>{label}</span><p>{text}</p></div>)}</div><div className={s.problemEnd}><p>どのサービスも便利です。<br />でも、場所が分かれるたびに、参加者は何度も移動する。<br />イベントが終わるたび、つながりや成果も分散してしまう。</p><strong>その距離を、なくしたい。</strong></div></section></Reveal>
    <Reveal><section id="features" className={`${s.container} ${s.section}`}><p className={s.eyebrow}>ONE PLACE, MORE POSSIBILITIES</p><h2>イベントも、成果も、交流も。<br />一つの場所に。</h2><p className={s.intro}>すでに動いているイベント管理・音声投稿機能を土台に、<br />あなたの運営に必要な仕組みを組み合わせます。</p><div className={s.featureGrid}>{features.map(({icon:Icon,title,status,text}) => <article key={title} className={s.glass}><Icon size={27} aria-hidden="true" /><span className={status === "既存機能" ? s.ready : s.custom}>{status}</span><h3>{title}</h3><p>{text}</p></article>)}</div><p className={s.note}>個別開発の範囲・費用は事前に確認します。掲載したすべての機能が、標準料金に含まれることを示すものではありません。</p></section></Reveal>
    <Reveal><section className={s.customSection}><div className={s.container}><p className={s.eyebrow}>YOUR OWN SOCIAL SPACE</p><h2>あなたに合わせた、<br /><span>独自SNSを。</span></h2><p className={s.intro}>学びを残す。作品を見せる。活動を報告する。<br />共有したいものも、交流のかたちも、コミュニティごとに違うから。</p><div className={s.customPoints}>{["何を投稿するか","誰に公開するか","どんな交流を育てるか"].map((text) => <div key={text}><Check size={19} aria-hidden="true" />{text}</div>)}</div><p>音声投稿のような既存の仕組みを活かしながら、投稿内容や閲覧範囲を個別に設計。<br />毎日投稿することや、タイムラインを埋め続けることを目的にしません。</p>{snsExamples.length > 0 && <div className={s.exampleSection}><h3>独自SNSの制作例</h3><Examples items={snsExamples} /></div>}<Link href="/lines/timeline" className={s.textLink}>既存の音声タイムラインを見る<ArrowRight size={17} aria-hidden="true" /></Link></div></section></Reveal>
    <Reveal><section className={`${s.container} ${s.section}`}><p className={s.eyebrow}>A CYCLE THAT BUILDS VALUE</p><h2>イベントが、<br />コミュニティの資産になる。</h2><p className={s.intro}>一度の参加が、次のきっかけへ。こんな循環を一緒につくります。</p><ol className={s.flow}>{["イベント申込","イベント参加","成果物の投稿","タイムラインで共有","外部SNSで発信","コミュニティや\n次回イベントへの興味"].map((text,index) => <li key={text}><span>{String(index+1).padStart(2,"0")}</span><strong>{text}</strong>{index < 5 && <ArrowRight className={s.flowArrow} size={20} aria-hidden="true" />}</li>)}</ol><div className={s.flowSummary}><Sparkles size={27} aria-hidden="true" /><p>積み重なる成果が、コミュニティの活動実績に。<br />参加者が自分の成果を発信することが、その魅力を外にも届けます。</p></div><p className={s.note}>図は目指す運用の流れです。成果物とイベントの紐づけなどは、ご要望に合わせて追加開発します。</p></section></Reveal>
    <Reveal><section className={`${s.container} ${s.section} ${s.socialSection}`}><div><p className={s.eyebrow}>CONNECTED, NOT REPLACED</p><h2>発信は自由に。<br />活動の拠点は一つに。</h2><p className={s.intro}>X、Instagram、LINEも、これまで通り。<br />それぞれの良さを活かしながら、役割を整理します。</p></div><div className={s.socialDiagram}><div><Layers size={26} aria-hidden="true" /><strong>あなたのアプリ</strong><span>成果物・活動履歴を蓄積</span></div><span className={s.exchange}>共有する ⇄ 興味を持って訪れる</span><div><Share2 size={26} aria-hidden="true" /><strong>外部SNS</strong><span>活動や成果を発信</span></div></div></section></Reveal>
    <Reveal><section id="works" className={`${s.container} ${s.section}`}><p className={s.eyebrow}>SEE IT IN ACTION</p><h2>実際のアプリを、体験する。</h2><p className={s.intro}>公開中のイベントアプリから、使い心地を確認できます。</p><Link href="/" className={s.textLink}>イベントアプリを見る<ArrowRight size={18} aria-hidden="true" /></Link>{works.length > 0 && <Examples items={works} />}</section></Reveal>
    <Reveal><section id="pricing" className={s.pricingSection}><div className={s.container}><p className={s.eyebrow}>START YOUR COMMUNITY</p><h2>導入をご検討中の方へ。<br />限定価格でご案内中！</h2><div className={s.pricingGrid}><article className={s.regularPrice}><h3>通常価格</h3><dl><div><dt>初期費用</dt><dd><s>{yen(config.regular.initial)}</s><small>円</small></dd></div><div><dt>月額利用料</dt><dd><s>{yen(config.regular.monthly)}</s><small>円／月</small></dd></div></dl><p>いずれも{config.taxLabel}</p></article><article className={s.limitedPrice}><span className={s.priceBadge}>限定価格</span><h3>あなたの活動の拠点を、ここから。</h3><dl><div><dt>初期費用</dt><dd>{yen(config.limited.initial)}<small>円</small></dd></div><div><dt>月額利用料</dt><dd>{yen(config.limited.monthly)}<small>円／月</small></dd></div></dl><p>いずれも{config.taxLabel}</p><Contact>限定価格で相談する</Contact></article></div><p className={s.priceNote}>機能・管理範囲や追加開発については、ご相談のうえ決定します。<br />限定価格の適用条件、契約期間、解約条件、サポート範囲はお申し込み前にご案内します。</p></div></section></Reveal>
    <Reveal><section id="faq" className={`${s.container} ${s.section}`}><p className={s.eyebrow}>FAQ</p><h2>よくある質問</h2><div className={s.faq}>{faqs.map(([q,a]) => <details key={q}><summary><span>Q.</span>{q}</summary><p>{a}</p></details>)}</div></section></Reveal>
    <section id="contact" className={s.finalCta}><div className={s.container}><Network size={40} aria-hidden="true" /><h2>あなたのコミュニティに、<br />活動の拠点を。</h2><p>夢を目指す人が集まり、学び、成果を共有する。<br />その活動を支える仕組みを、一緒に作りませんか？</p><Contact>構築について相談する</Contact><span className={s.contactNote}>公式LINEが開きます。「コミュニティアプリの相談」とお送りください。</span></div></section>
    <footer className={s.footer}><Link href="/" className={s.brand}>しお缶</Link><p>夢を実現するために、コミュニティを強くする。</p><a href="#features">機能を見る</a><a href="#pricing">料金を見る</a></footer>
  </main>;
}
