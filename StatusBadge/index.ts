import { IInputs, IOutputs } from "./generated/ManifestTypes";

type StatusVariant = "active" | "in-use" | "available" | "maintenance" | "inactive";
type BadgeSize = "small" | "medium" | "large";
type BadgeTheme = "light" | "dark" | "auto";

interface StatusDefinition {
    label: string;
    variant: StatusVariant;
}

const STATUS_DEFINITIONS: Record<StatusVariant, StatusDefinition> = {
    active: { label: "Ativo", variant: "active" },
    "in-use": { label: "Em Uso", variant: "in-use" },
    available: { label: "Disponível", variant: "available" },
    maintenance: { label: "Em Manutenção", variant: "maintenance" },
    inactive: { label: "Inativo", variant: "inactive" }
};

const STATUS_ALIASES: Record<string, StatusVariant> = {
    ativo: "active",
    active: "active",
    "em uso": "in-use",
    "in-use": "in-use",
    "in use": "in-use",
    disponível: "available",
    disponivel: "available",
    available: "available",
    "em manutenção": "maintenance",
    "em manutencao": "maintenance",
    maintenance: "maintenance",
    inactive: "inactive",
    inativo: "inactive"
};

export class StatusBadge implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private badgeElement?: HTMLDivElement;
    private iconElement?: HTMLSpanElement;
    private labelElement?: HTMLSpanElement;

    public init(
        context: ComponentFramework.Context<IInputs>,
        _notifyOutputChanged: () => void,
        _state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.badgeElement = document.createElement("div");
        this.badgeElement.className = "status-badge status-badge--active status-badge--medium";
        this.badgeElement.setAttribute("role", "status");

        this.iconElement = document.createElement("span");
        this.iconElement.className = "status-badge__icon";
        this.iconElement.setAttribute("aria-hidden", "true");

        this.labelElement = document.createElement("span");
        this.labelElement.className = "status-badge__label";

        this.badgeElement.append(this.iconElement, this.labelElement);
        container.replaceChildren(this.badgeElement);
        this.updateView(context);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        if (!this.badgeElement || !this.labelElement || !this.iconElement) {
            return;
        }

        const definition = this.getDefinition(context.parameters.status.raw);
        const customText = context.parameters.customText.raw?.trim();
        const label = customText || definition.label;
        const showIcon = context.parameters.showIcon.raw !== false;
        const size = this.getSize(context.parameters.size.raw);
        const theme = this.getTheme(context.parameters.theme.raw);

        this.badgeElement.className = `status-badge status-badge--${definition.variant} status-badge--${size}`;
        this.badgeElement.dataset.theme = theme;
        this.badgeElement.setAttribute("aria-label", label);
        this.labelElement.textContent = label;
        this.iconElement.hidden = !showIcon;
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        this.badgeElement = undefined;
        this.iconElement = undefined;
        this.labelElement = undefined;
    }

    private getDefinition(rawStatus: string | null): StatusDefinition {
        const normalizedStatus = (rawStatus || "").trim().toLocaleLowerCase();
        const variant = STATUS_ALIASES[normalizedStatus] || "inactive";
        return STATUS_DEFINITIONS[variant];
    }

    private getSize(rawSize: string | null): BadgeSize {
        const normalizedSize = (rawSize || "").trim().toLocaleLowerCase();
        return normalizedSize === "small" || normalizedSize === "large" ? normalizedSize : "medium";
    }

    private getTheme(rawTheme: string | null): BadgeTheme {
        const normalizedTheme = (rawTheme || "").trim().toLocaleLowerCase();
        return normalizedTheme === "light" || normalizedTheme === "dark" ? normalizedTheme : "auto";
    }
}
