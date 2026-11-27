import { IInputs, IOutputs } from "./generated/ManifestTypes";

type SortDirection = "none" | "asc" | "desc";

interface SortState {
    column: string | null;
    direction: SortDirection;
}

export class AdvancedTableV2 implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private container!: HTMLDivElement;
    private dataset!: ComponentFramework.PropertyTypes.DataSet;
    private sortState: SortState = { column: null, direction: "none" };
    private selectedRecordId: string | null = null;
    private pendingPageLoad = false;
    private recordCountBeforePageLoad = 0;

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.container = container;
        this.dataset = context.parameters.records;
        this.syncSortState();
        this.injectStyles();
        this.render();
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        this.dataset = context.parameters.records;
        this.syncSortState();

        const selectedRecordIds = this.dataset.getSelectedRecordIds();
        this.selectedRecordId = selectedRecordIds.length > 0 ? selectedRecordIds[0] : null;

        if (this.pendingPageLoad && !this.dataset.loading) {
            if (this.dataset.sortedRecordIds.length > this.recordCountBeforePageLoad || !this.dataset.paging.hasNextPage) {
                this.pendingPageLoad = false;
            }
        }
        this.render();
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        this.container.replaceChildren();
    }

    private render(): void {
        const root = document.createElement("section");
        root.className = "advanced-table";
        root.setAttribute("aria-label", "Tabela de registros do Dataverse");

        const heading = document.createElement("div");
        heading.className = "advanced-table__heading";
        const titleContainer = document.createElement("div");
        const eyebrow = document.createElement("span");
        eyebrow.className = "advanced-table__eyebrow";
        eyebrow.textContent = "DADOS DO DATAVERSE";
        const title = document.createElement("h2");
        title.textContent = this.dataset.getTitle() || "Registros";
        titleContainer.append(eyebrow, title);

        const count = document.createElement("span");
        count.className = "advanced-table__count";
        const totalCount = this.dataset.paging.totalResultCount;
        count.textContent = totalCount > 0
            ? `${totalCount} ${totalCount === 1 ? "registro" : "registros"}`
            : `${this.dataset.sortedRecordIds.length} registros carregados`;
        heading.append(titleContainer, count);

        const viewport = document.createElement("div");
        viewport.className = "advanced-table__viewport";
        const table = document.createElement("table");
        table.className = "advanced-table__grid";

        const columns = this.dataset.columns.filter((column) => !column.isHidden);
        table.appendChild(this.createHeader(columns));

        const body = document.createElement("tbody");
        this.dataset.sortedRecordIds.forEach((recordId) => {
            const record = this.dataset.records[recordId];
            if (!record) {
                return;
            }
            const row = document.createElement("tr");
            const isSelected = recordId === this.selectedRecordId;
            row.className = isSelected ? "is-selected" : "";
            row.tabIndex = 0;
            row.setAttribute("aria-selected", String(isSelected));
            row.addEventListener("click", () => this.selectRecord(recordId));
            row.addEventListener("keydown", (event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    this.selectRecord(recordId);
                }
            });

            columns.forEach((column) => {
                const cell = document.createElement("td");
                const formattedValue = record.getFormattedValue(column.name);
                cell.textContent = formattedValue || this.formatValue(record.getValue(column.name));
                if (column.name === this.sortState.column && this.sortState.direction !== "none") {
                    cell.className = "is-sorted";
                }
                row.appendChild(cell);
            });
            body.appendChild(row);
        });
        table.appendChild(body);
        viewport.appendChild(table);

        root.appendChild(heading);
        root.appendChild(viewport);
        this.appendStatus(root);
        this.appendLoadMoreButton(root);
        this.container.replaceChildren(root);
    }

    private createHeader(columns: ComponentFramework.PropertyHelper.DataSetApi.Column[]): HTMLTableSectionElement {
        const header = document.createElement("thead");
        const row = document.createElement("tr");
        columns.forEach((column) => {
            const headerCell = document.createElement("th");
            headerCell.scope = "col";
            const button = document.createElement("button");
            button.className = "advanced-table__sort-button";
            button.type = "button";
            button.disabled = column.disableSorting === true;

            const label = document.createElement("span");
            label.textContent = column.displayName || column.name;
            button.appendChild(label);

            if (column.disableSorting !== true) {
                const indicator = document.createElement("span");
                indicator.className = "advanced-table__sort-indicator";
                const isActive = this.sortState.column === column.name && this.sortState.direction !== "none";
                indicator.textContent = isActive
                    ? (this.sortState.direction === "asc" ? "↑" : "↓")
                    : "↕";
                indicator.setAttribute("aria-hidden", "true");
                button.appendChild(indicator);
                button.setAttribute("aria-label", `Ordenar por ${column.displayName || column.name}`);
                button.addEventListener("click", () => this.toggleSort(column.name));
                headerCell.setAttribute(
                    "aria-sort",
                    isActive ? (this.sortState.direction === "asc" ? "ascending" : "descending") : "none"
                );
            }

            headerCell.appendChild(button);
            row.appendChild(headerCell);
        });
        header.appendChild(row);
        return header;
    }

    private toggleSort(columnName: string): void {
        if (this.sortState.column !== columnName) {
            this.sortState = { column: columnName, direction: "asc" };
        } else if (this.sortState.direction === "asc") {
            this.sortState.direction = "desc";
        } else {
            this.sortState = { column: null, direction: "none" };
        }

        this.dataset.sorting = this.sortState.column
            ? [{
                name: this.sortState.column,
                sortDirection: this.sortState.direction === "asc" ? 0 : 1
            }]
            : [];
        this.dataset.refresh();
    }

    private syncSortState(): void {
        const sorting = this.dataset.sorting;
        const activeSort = Array.isArray(sorting)
            ? sorting.find((sort) => sort.sortDirection !== -1)
            : undefined;
        if (!activeSort) {
            this.sortState = { column: null, direction: "none" };
            return;
        }
        this.sortState = {
            column: activeSort.name,
            direction: activeSort.sortDirection === 0 ? "asc" : "desc"
        };
    }

    private selectRecord(recordId: string): void {
        this.selectedRecordId = recordId;
        this.dataset.setSelectedRecordIds([recordId]);
        this.render();
    }

    private formatValue(value: unknown): string {
        if (value === null || value === undefined || value === "") {
            return "—";
        }
        if (value instanceof Date) {
            return value.toLocaleDateString();
        }
        if (Array.isArray(value)) {
            return value.map((item) => this.formatValue(item)).join(", ");
        }
        if (typeof value === "object" && "name" in value && typeof value.name === "string") {
            return value.name;
        }
        return String(value);
    }

    private appendStatus(root: HTMLElement): void {
        const status = document.createElement("div");
        status.className = "advanced-table__status";
        status.setAttribute("role", "status");

        if (this.dataset.error) {
            status.textContent = this.dataset.errorMessage || "Não foi possível carregar os registros.";
        } else if (this.dataset.loading) {
            status.textContent = "Carregando registros...";
        } else if (this.dataset.sortedRecordIds.length === 0) {
            status.textContent = "Nenhum registro encontrado. Verifique a tabela e a visualização vinculadas no Power Apps.";
        }

        if (status.textContent) {
            root.appendChild(status);
        }
    }

    private appendLoadMoreButton(root: HTMLElement): void {
        if (!this.dataset.paging.hasNextPage) {
            return;
        }

        const button = document.createElement("button");
        button.className = "advanced-table__load-more";
        button.type = "button";
        button.disabled = this.dataset.loading || this.pendingPageLoad;
        button.textContent = button.disabled ? "Carregando..." : "Carregar mais registros";
        button.addEventListener("click", () => {
            if (this.dataset.loading || this.pendingPageLoad || !this.dataset.paging.hasNextPage) {
                return;
            }
            this.recordCountBeforePageLoad = this.dataset.sortedRecordIds.length;
            this.pendingPageLoad = true;
            this.dataset.paging.loadNextPage();
            this.render();
        });
        root.appendChild(button);
    }

    private injectStyles(): void {
        if (document.getElementById("advanced-table-styles")) {
            return;
        }
        const style = document.createElement("style");
        style.id = "advanced-table-styles";
        style.textContent = `
            .advanced-table {
                --at-ink: #262626; --at-muted: #6f6f6f; --at-line: rgba(38, 38, 38, .12); --at-accent: #b5091b;
                box-sizing: border-box; width: 100%; min-width: 280px; padding: 22px; color: var(--at-ink);
                font-family: "Segoe UI", Arial, sans-serif; background: linear-gradient(145deg, rgba(255, 255, 255, .98), rgba(248, 248, 248, .98));
                border: 1px solid rgba(38, 38, 38, .14); border-radius: 20px;
                box-shadow: 0 18px 45px rgba(0, 0, 0, .14), inset 0 1px 0 rgba(255,255,255,.9); overflow: hidden;
            }
            .advanced-table__heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
            .advanced-table__eyebrow { display: block; color: var(--at-accent); font-size: 10px; font-weight: 700; letter-spacing: .16em; margin-bottom: 6px; }
            .advanced-table h2 { margin: 0; font-size: 21px; font-weight: 650; letter-spacing: -.02em; }
            .advanced-table__count { color: var(--at-muted); font-size: 12px; white-space: nowrap; }
            .advanced-table__viewport { max-height: 390px; overflow: auto; border: 1px solid var(--at-line); border-radius: 13px; background: rgba(255, 255, 255, .78); scrollbar-color: rgba(181, 9, 27, .45) transparent; scrollbar-width: thin; }
            .advanced-table__grid { width: 100%; min-width: 620px; border-collapse: separate; border-spacing: 0; }
            .advanced-table th { position: sticky; top: 0; z-index: 1; padding: 0; text-align: left; background: rgba(255, 255, 255, .98); border-bottom: 1px solid var(--at-line); }
            .advanced-table__sort-button { position: relative; display: flex; align-items: center; justify-content: center; width: 100%; padding: 15px 32px; color: var(--at-muted); background: transparent; border: 0; font: inherit; font-size: 11px; font-weight: 700; letter-spacing: .05em; text-align: center; text-transform: uppercase; cursor: pointer; transition: color .2s ease, background .2s ease; }
            .advanced-table__sort-button:disabled { cursor: default; }
            .advanced-table__sort-button:hover:not(:disabled), .advanced-table__sort-button:focus-visible { color: var(--at-ink); background: rgba(181, 9, 27, .06); outline: none; }
            .advanced-table__sort-indicator { position: absolute; right: 12px; color: var(--at-accent); font-size: 16px; line-height: 1; opacity: .8; }
            .advanced-table td { padding: 16px; color: #333333; font-size: 13px; border-bottom: 1px solid var(--at-line); transition: background .2s ease, color .2s ease; }
            .advanced-table tbody tr { cursor: pointer; transition: transform .2s ease, background .2s ease; }
            .advanced-table tbody tr:hover { background: rgba(181, 9, 27, .045); }
            .advanced-table tbody tr:focus-visible { outline: 2px solid var(--at-accent); outline-offset: -2px; }
            .advanced-table tbody tr.is-selected { background: linear-gradient(90deg, rgba(181, 9, 27, .12), rgba(181, 9, 27, .025)); }
            .advanced-table tbody tr.is-selected td:first-child { box-shadow: inset 3px 0 var(--at-accent); color: #1d1d1d; }
            .advanced-table td.is-sorted { background: rgba(181, 9, 27, .035); }
            .advanced-table tbody tr:last-child td { border-bottom: 0; }
            .advanced-table__status { padding: 18px 12px; color: var(--at-muted); font-size: 13px; text-align: center; }
            .advanced-table__load-more { display: block; margin: 14px auto 0; padding: 10px 18px; color: var(--at-accent); background: #fff; border: 1px solid rgba(181, 9, 27, .35); border-radius: 9px; font: inherit; cursor: pointer; transition: background .2s ease, color .2s ease; }
            .advanced-table__load-more:hover:not(:disabled) { color: #fff; background: var(--at-accent); }
            .advanced-table__load-more:disabled { opacity: .65; cursor: wait; }
            @media (max-width: 560px) { .advanced-table { padding: 16px; border-radius: 16px; } .advanced-table h2 { font-size: 18px; } .advanced-table__heading { align-items: flex-start; flex-direction: column; gap: 8px; } }
        `;
        document.head.appendChild(style);
    }
}
