import { booleanAttribute, Directive, ElementRef, inject, input, OnDestroy } from '@angular/core';

const MARGIN = 8;
const GAP = 10;
const BRIDGE = 10;

@Directive({
  selector: '[appHint]',
  standalone: true,
  host: {
    '(mouseenter)': 'show()',
    '(mouseleave)': 'hide($event)',
    '(focusin)': 'show()',
    '(focusout)': 'hide($event)',
  },
})
export class HintDirective implements OnDestroy {
  readonly appHint = input('');
  readonly appHintWrap = input(false, { transform: booleanAttribute });

  private element = inject<ElementRef<HTMLElement>>(ElementRef);
  private bubble: HTMLDivElement | null = null;
  private contentBound: HTMLElement | null = null;
  private contentHome: { parent: Node; next: ChildNode | null } | null = null;
  private hideTimer = 0;
  private anchorKey = '';

  private readonly onScroll = () => {
    const rect = this.element.nativeElement.getBoundingClientRect();
    const key = `${Math.round(rect.top)}:${Math.round(rect.left)}`;
    if (key === this.anchorKey) return;
    this.close();
  };
  private readonly onPointerMove = (event: PointerEvent) => {
    const content = this.content();
    if (!content) return;
    if (this.covers(event.clientX, event.clientY, content)) {
      window.clearTimeout(this.hideTimer);
      this.hideTimer = 0;
      return;
    }
    this.scheduleClose();
  };
  private readonly onContentEnter = () => {
    window.clearTimeout(this.hideTimer);
    this.hideTimer = 0;
  };
  private readonly onContentLeave = (event: MouseEvent) => this.hide(event);

  ngOnDestroy(): void {
    this.close();
    this.contentBound?.removeEventListener('mouseenter', this.onContentEnter);
    this.contentBound?.removeEventListener('mouseleave', this.onContentLeave);
    this.contentBound = null;
    this.bubble?.remove();
    this.bubble = null;
  }

  show(): void {
    window.clearTimeout(this.hideTimer);
    this.hideTimer = 0;
    const content = this.content();
    const text = this.appHint().trim();
    if (!content && !text) return;

    if (content) {
      this.bindContent(content);
      this.placeContent(content);
    } else {
      this.placeBubble(text);
    }

    const anchor = this.element.nativeElement.getBoundingClientRect();
    this.anchorKey = `${Math.round(anchor.top)}:${Math.round(anchor.left)}`;
    this.markOpen(content, true);
    document.addEventListener('scroll', this.onScroll, true);
    if (content) document.addEventListener('pointermove', this.onPointerMove, true);
  }

  hide(event: Event): void {
    const content = this.content();
    const next = 'relatedTarget' in event ? (event as MouseEvent).relatedTarget : null;
    if (next instanceof Node && (this.element.nativeElement.contains(next) || content?.contains(next))) return;
    if (content && event instanceof MouseEvent && this.covers(event.clientX, event.clientY, content)) return;

    if (content) {
      this.scheduleClose();
      return;
    }
    this.close();
  }

  private scheduleClose(): void {
    if (this.hideTimer) return;
    this.hideTimer = window.setTimeout(() => this.close(), 120);
  }

  private close(): void {
    window.clearTimeout(this.hideTimer);
    this.hideTimer = 0;
    const content = this.content();
    this.markOpen(content, false);
    if (content) this.restoreContent(content);
    document.removeEventListener('scroll', this.onScroll, true);
    document.removeEventListener('pointermove', this.onPointerMove, true);
  }

  private covers(x: number, y: number, content: HTMLElement): boolean {
    const host = this.element.nativeElement.getBoundingClientRect();
    const panel = content.getBoundingClientRect();
    const pad = 6;
    const left = Math.min(host.left, panel.left) - pad;
    const right = Math.max(host.right, panel.right) + pad;
    const top = Math.min(host.top, panel.top) - pad;
    const bottom = Math.max(host.bottom, panel.bottom) + pad;
    return x >= left && x <= right && y >= top && y <= bottom;
  }

  private content(): HTMLElement | null {
    if (this.contentHome && this.contentBound?.isConnected) return this.contentBound;
    const found = this.element.nativeElement.querySelector('[appHintContent]');
    return found instanceof HTMLElement ? found : null;
  }

  private bindContent(content: HTMLElement): void {
    if (this.contentBound === content) return;
    this.contentBound?.removeEventListener('mouseenter', this.onContentEnter);
    this.contentBound?.removeEventListener('mouseleave', this.onContentLeave);
    this.contentBound = content;
    content.addEventListener('mouseenter', this.onContentEnter);
    content.addEventListener('mouseleave', this.onContentLeave);
  }

  private placeBubble(text: string): void {
    const bubble = this.ensureBubble();
    bubble.textContent = text;
    bubble.classList.toggle('hint-bubble_wrap', this.appHintWrap());
    bubble.style.opacity = '0';
    const rect = this.element.nativeElement.getBoundingClientRect();
    const width = bubble.offsetWidth;
    const height = bubble.offsetHeight;
    const spaceAbove = rect.top - MARGIN;
    const spaceBelow = window.innerHeight - rect.bottom - MARGIN;
    const below = spaceAbove < height + GAP && spaceBelow > spaceAbove;
    let top = below ? rect.bottom + GAP : rect.top - GAP - height;
    let left = rect.left + rect.width / 2 - width / 2;
    left = clamp(left, MARGIN, window.innerWidth - MARGIN - width);
    top = clamp(top, MARGIN, window.innerHeight - MARGIN - height);
    bubble.style.left = `${left}px`;
    bubble.style.top = `${top}px`;
  }

  private placeContent(content: HTMLElement): void {
    this.mountContent(content);
    const rect = this.element.nativeElement.getBoundingClientRect();
    content.style.position = 'fixed';
    content.style.zIndex = '1000001';
    content.style.paddingLeft = `${BRIDGE}px`;
    content.style.paddingRight = '0';

    const spaceRight = window.innerWidth - rect.right - MARGIN;
    const spaceLeft = rect.left - MARGIN;
    const placeRight = spaceRight >= content.offsetWidth || spaceRight >= spaceLeft;
    content.style.paddingLeft = placeRight ? `${BRIDGE}px` : '0';
    content.style.paddingRight = placeRight ? '0' : `${BRIDGE}px`;

    const room = Math.max(160, Math.min(280, (placeRight ? spaceRight : spaceLeft) - BRIDGE));
    const panel = content.querySelector('.hint-panel');
    if (panel instanceof HTMLElement) panel.style.maxWidth = `${room}px`;

    const width = content.offsetWidth;
    const height = content.offsetHeight;
    let top = rect.top;
    if (top + height > window.innerHeight - MARGIN) top = window.innerHeight - MARGIN - height;
    if (top < MARGIN) top = MARGIN;
    const left = placeRight ? rect.right : Math.max(MARGIN, rect.left - width);
    content.style.top = `${top}px`;
    content.style.left = `${clamp(left, MARGIN, window.innerWidth - MARGIN - width)}px`;
  }

  private mountContent(content: HTMLElement): void {
    if (content.parentNode === document.body) return;
    const parent = content.parentNode;
    if (!parent) return;
    this.contentHome = { parent, next: content.nextSibling };
    document.body.appendChild(content);
  }

  private restoreContent(content: HTMLElement): void {
    content.style.left = '';
    content.style.top = '';
    content.style.paddingLeft = '';
    content.style.paddingRight = '';
    content.style.zIndex = '';
    content.style.position = '';
    const panel = content.querySelector('.hint-panel');
    if (panel instanceof HTMLElement) panel.style.maxWidth = '';
    const home = this.contentHome;
    this.contentHome = null;
    if (!home || content.parentNode !== document.body) return;
    home.parent.insertBefore(content, home.next);
  }

  private markOpen(content: HTMLElement | null, open: boolean): void {
    if (content) {
      content.style.opacity = open ? '1' : '0';
      content.style.pointerEvents = open ? 'auto' : 'none';
      return;
    }
    if (this.bubble) this.bubble.style.opacity = open ? '1' : '0';
  }

  private ensureBubble(): HTMLDivElement {
    if (this.bubble) return this.bubble;
    const bubble = document.createElement('div');
    bubble.className = 'hint-bubble';
    bubble.style.opacity = '0';
    document.body.appendChild(bubble);
    this.bubble = bubble;
    return bubble;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
