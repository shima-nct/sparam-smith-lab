# Sパラメータ・スミスチャート実験室

伝送線路と集中定数RLC回路のSパラメータ、スミスチャート、負荷による入力インピーダンス変換を確認するブラウザー教材。

公開版：[GitHub Pages](https://shima-nct.github.io/sparam-smith-lab/)

- 一様線路：Z₀、長さ、位相速度、減衰定数。
- 集中定数回路：最大8個の直列・並列R/L/Cを入力側から縦続接続。
- 全4要素の振幅・位相、周波数特性、反射・透過・回路内損失の電力比。
- S₁₁、S₂₂、任意負荷でのΓinのスミスチャート。401点の周波数掃引と連動。
- 開放・短絡・複素負荷、Zin、VSWR、リターンロス、掃引CSV。

## 実行と検証

このディレクトリで `python -m http.server 8796 --bind 127.0.0.1 --directory dist` を実行し、ブラウザーで http://127.0.0.1:8796/ を開く。ES modulesを使用するためHTTP配信が必要。

数値検証：`node tests/model.test.mjs`。ビルド・依存パッケージ不要。

`main` へのpush時にGitHub Actionsで数値検証を実行し、成功した場合に `dist/` をGitHub Pagesへデプロイする。手動実行はActionsの「Deploy GitHub Pages」から行う。

授業第4・5回のF行列、波の規約、正規化インピーダンスに対応。線路の特性インピーダンスZ₀と両ポート共通の実数基準Zrefを区別する。Sパラメータを求める終端と任意負荷でのΓinを区別する。時間因子はexp(jωt)。線路は実数の一定Z₀、一定vp・α。RLCは理想素子で寄生成分や分散を含まない。図の正規化インピーダンスzと線路座標zは文脈で区別する。

振幅グラフの表示下限は−80 dB。位相の折り返しは接続せず、振幅0の位相は未定義。Zinの極は∞と表示。CSVにはモデル条件と複素数の実部・虚部を含める。

参考式を照合した一次資料：[Qucs Transmission Line](https://qucs.sourceforge.net/tech/node61.html)、[Qucs matrix conversions](https://qucs.sourceforge.net/tech/node98.html)。授業資料および教科書ファイルはアプリに同梱しない。

ソースは独立した新規ディレクトリ内に保存。既存教材やClassroom掲載分は変更していない。
