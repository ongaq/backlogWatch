import { html, css, LitElement } from "https://esm.sh/lit@2.6.1";
import { customElement, property } from "https://esm.sh/lit@2.6.1/decorators";

@customElement('history-list')
export class HistoryList extends LitElement {
  static styles = css`
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

  @property() version = '';
  @property() date = '';
  @property() history = '[]';
  @property() sections = '[]';

  render() {
    const items = JSON.parse(this.history).map((text: string) => {
      return html`<li>${text}</li>`;
    });
    const sections = JSON.parse(this.sections).map((title: string) => html`
      <h3 class="title is-5">${title}</h3>
      <slot name="${title}"></slot>
    `);

    return html`<hr>
      <section class="content">
        <h2 class="title is-4">
          v${this.version}
          <span class="subtitle is-6">(${this.date})</span>
        </h2>
        ${sections}
        <ul class="history">${items}</ul>
      </section>`;
  }
}
