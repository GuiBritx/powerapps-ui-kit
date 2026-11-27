import { IInputs, IOutputs } from "./generated/ManifestTypes";

type ButtonVariant = "primary" | "secondary" | "success" | "warning" | "danger";
type ButtonSize = "small" | "medium" | "large";

interface ActionButtonParameters {
    label?: { raw?: string };
    variant?: { raw?: string };
    size?: { raw?: string };
    disabled?: { raw?: boolean };
    showIcon?: { raw?: boolean };
    theme?: { raw?: string };
}

const ACTION_BUTTON_STYLES = `
.guilherme-action-button {
    --action-button-accent: #5b8def;
    --action-button-accent-strong: #3b6fd8;
    --action-button-text: #ffffff;
    --action-button-surface: rgba(255,255,255,.16);
    --action-button-surface-strong: rgba(255,255,255,.04);
    --action-button-border: rgba(255,255,255,.34);
    --action-button-shadow: rgba(31,51,96,.20);
    align-items: center;
    appearance: none;
    background:
        linear-gradient(135deg, var(--action-button-surface), var(--action-button-surface-strong) 42%),
        linear-gradient(135deg, var(--action-button-accent), var(--action-button-accent-strong));
    border: 1px solid var(--action-button-border);
    border-radius: 12px;
    box-shadow:
        0 1px 0 rgba(255,255,255,.34) inset,
        0 -1px 0 rgba(0,0,0,.12) inset,
        0 10px 24px var(--action-button-shadow),
        0 3px 7px rgba(31,51,96,.18);
    box-sizing: border-box;
    color: var(--action-button-text);
    cursor: pointer;
    display: inline-flex;
    font-family: "Segoe UI", system-ui, sans-serif;
    font-size: 14px;
    font-weight: 600;
    gap: 9px;
    justify-content: center;
    letter-spacing: .01em;
    min-width: 112px;
    overflow: hidden;
    position: relative;
    text-transform: none;
    transform: translateY(0);
    transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
    user-select: none;
}
.guilherme-action-button::before {
    background: linear-gradient(115deg, rgba(255,255,255,.28), transparent 38%);
    content: "";
    inset: 0;
    pointer-events: none;
    position: absolute;
}
.guilherme-action-button:hover:not(:disabled) {
    box-shadow:
        0 1px 0 rgba(255,255,255,.46) inset,
        0 -1px 0 rgba(0,0,0,.12) inset,
        0 15px 30px rgba(31,51,96,.26),
        0 0 20px color-mix(in srgb, var(--action-button-accent) 32%, transparent);
    filter: saturate(1.08) brightness(1.04);
    transform: translateY(-2px);
}
.guilherme-action-button:active:not(:disabled) {
    box-shadow:
        0 1px 0 rgba(255,255,255,.25) inset,
        0 3px 8px rgba(31,51,96,.24);
    transform: translateY(1px) scale(.985);
}
.guilherme-action-button:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--action-button-accent) 40%, transparent);
    outline-offset: 3px;
}
.guilherme-action-button:disabled {
    cursor: not-allowed;
    filter: grayscale(.25);
    opacity: .52;
}
.guilherme-action-button[data-size="small"] { min-height: 32px; padding: 0 13px; font-size: 12px; }
.guilherme-action-button[data-size="medium"] { min-height: 40px; padding: 0 18px; }
.guilherme-action-button[data-size="large"] { min-height: 48px; padding: 0 23px; font-size: 15px; }
.guilherme-action-button[data-variant="primary"] { --action-button-accent: #5b8def; --action-button-accent-strong: #315fc5; }
.guilherme-action-button[data-variant="secondary"] { --action-button-accent: #64748b; --action-button-accent-strong: #334155; }
.guilherme-action-button[data-variant="success"] { --action-button-accent: #18a878; --action-button-accent-strong: #087c5a; }
.guilherme-action-button[data-variant="warning"] { --action-button-accent: #e7a52c; --action-button-accent-strong: #bf7410; }
.guilherme-action-button[data-variant="danger"] { --action-button-accent: #e05b68; --action-button-accent-strong: #b52e42; }
.guilherme-action-button[data-theme="light"] {
    --action-button-surface: rgba(255,255,255,.38);
    --action-button-surface-strong: rgba(255,255,255,.12);
    --action-button-border: rgba(255,255,255,.62);
    --action-button-shadow: rgba(31,51,96,.24);
    filter: brightness(1.08) saturate(1.04);
}
.guilherme-action-button[data-theme="dark"] {
    --action-button-surface: rgba(9,18,38,.44);
    --action-button-surface-strong: rgba(5,12,28,.72);
    --action-button-border: rgba(190,215,255,.28);
    --action-button-shadow: rgba(4,10,25,.48);
    filter: brightness(.86) saturate(1.18);
}
@media (prefers-color-scheme: dark) {
    .guilherme-action-button[data-theme="auto"] {
        --action-button-surface: rgba(9,18,38,.36);
        --action-button-surface-strong: rgba(5,12,28,.6);
        --action-button-border: rgba(190,215,255,.24);
        --action-button-shadow: rgba(4,10,25,.42);
        filter: brightness(.92) saturate(1.08);
    }
}
.guilherme-action-button__icon,
.guilherme-action-button__label { position: relative; }
.guilherme-action-button__icon { font-size: 1.05em; line-height: 1; }
`;

const ICONS: Record<ButtonVariant, string> = {
    primary: "✓",
    secondary: "✦",
    success: "✓",
    warning: "⚡",
    danger: "⚠"
};

function normalizeValue<T extends string>(value: string | undefined, values: readonly T[], fallback: T): T {
    const normalized = value?.trim().toLowerCase() as T;
    return values.includes(normalized) ? normalized : fallback;
}

export class ActionButton implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private button: HTMLButtonElement | undefined;
    private label: HTMLSpanElement | undefined;
    private icon: HTMLSpanElement | undefined;

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        void context;
        void notifyOutputChanged;
        void state;

        if (!document.getElementById("guilherme-action-button-styles")) {
            const style = document.createElement("style");
            style.id = "guilherme-action-button-styles";
            style.textContent = ACTION_BUTTON_STYLES;
            document.head.appendChild(style);
        }

        this.button = document.createElement("button");
        this.button.className = "guilherme-action-button";
        this.button.type = "button";
        this.button.setAttribute("aria-live", "polite");

        this.icon = document.createElement("span");
        this.icon.className = "guilherme-action-button__icon";
        this.icon.setAttribute("aria-hidden", "true");
        this.label = document.createElement("span");
        this.label.className = "guilherme-action-button__label";

        this.button.append(this.icon, this.label);
        container.replaceChildren(this.button);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        if (!this.button || !this.label || !this.icon) {
            return;
        }

        const parameters = context.parameters as unknown as ActionButtonParameters;
        const variant = normalizeValue(parameters.variant?.raw, ["primary", "secondary", "success", "warning", "danger"], "primary");
        const size = normalizeValue(parameters.size?.raw, ["small", "medium", "large"], "medium");
        const theme = normalizeValue(parameters.theme?.raw, ["light", "dark", "auto"], "auto");
        const label = parameters.label?.raw?.trim() || "Action";
        const showIcon = parameters.showIcon?.raw !== false;
        const disabled = parameters.disabled?.raw === true;

        this.button.dataset.variant = variant;
        this.button.dataset.size = size;
        this.button.dataset.theme = theme;
        this.button.disabled = disabled;
        this.button.setAttribute("aria-label", label);
        this.label.textContent = label;
        this.icon.textContent = ICONS[variant];
        this.icon.hidden = !showIcon;
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        this.button = undefined;
        this.label = undefined;
        this.icon = undefined;
    }
}
