var __decorate =
  (this && this.__decorate) ||
  function (t, e, s, i) {
    var o,
      r = arguments.length,
      n = r < 3 ? e : null === i ? (i = Object.getOwnPropertyDescriptor(e, s)) : i;
    if ('object' == typeof Reflect && 'function' == typeof Reflect.decorate) n = Reflect.decorate(t, e, s, i);
    else for (var l = t.length - 1; l >= 0; l--) (o = t[l]) && (n = (r < 3 ? o(n) : r > 3 ? o(e, s, n) : o(e, s)) || n);
    return r > 3 && n && Object.defineProperty(e, s, n), n;
  };
import { html as t, css as e, LitElement as s } from 'https://esm.sh/lit@2.6.1';
import { customElement as i, property as o } from 'https://esm.sh/lit@2.6.1/decorators';
export let HistoryList = class extends s {
  static styles = e`
    hr {
      background-color: #f5f5f5;
      border: none;
      display: block;
      height: 2px;
      margin: 1.5rem 0;
    }
    .content {
      margin-bottom: 1.5rem;
    }
    .title {
      margin-bottom: 1.5rem
      color: #363636;
      font-weight: 600;
      line-height: 1.125;
    }
    .title.is-4 {
      font-size: 1.5rem;
    }
    .subtitle {
      color: #4a4a4a;
      line-height: 1.25;
    }
    .subtitle.is-6 {
      font-size: 1rem;
    }
    .history {
      list-style: disc outside;
      margin: 1em 0 1em 2em;
      margin-block-start: 0;
      margin-block-end: 0;
      padding-inline-start: 0;
    }
  `;
  version = '';
  date = '';
  history = '[]';
  sections = '[]';
  render() {
    let e = JSON.parse(this.history).map((e) => t`<li>${e}</li>`),
      s = JSON.parse(this.sections).map(
        (e) => t`
      <h3 class="title is-5">${e}</h3>
      <slot name="${e}"></slot>
    `,
      );
    return t`<hr>
      <section class="content">
        <h2 class="title is-4">
          v${this.version}
          <span class="subtitle is-6">(${this.date})</span>
        </h2>
        ${s}
        <ul class="history">${e}</ul>
      </section>`;
  }
};
__decorate([o()], HistoryList.prototype, 'version', void 0),
  __decorate([o()], HistoryList.prototype, 'date', void 0),
  __decorate([o()], HistoryList.prototype, 'history', void 0),
  __decorate([o()], HistoryList.prototype, 'sections', void 0),
  (HistoryList = __decorate([i('history-list')], HistoryList));
