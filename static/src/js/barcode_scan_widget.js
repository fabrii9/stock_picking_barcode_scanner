/** @odoo-module **/

console.log("[BarcodeScanner] Cargando widget...");

import { registry } from "@web/core/registry";
import { standardFieldProps } from "@web/views/fields/standard_field_props";
import { useService } from "@web/core/utils/hooks";
import { Component, useRef, useState, onMounted, xml } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";

class BarcodeQuantityDialog extends Component {
    setup() {
        this.state = useState({ quantity: 1.0 });
        this.qtyInputRef = useRef("qtyInput");
        onMounted(() => {
            if (this.qtyInputRef.el) {
                this.qtyInputRef.el.focus();
                this.qtyInputRef.el.select();
            }
        });
    }
    onInput(ev) {
        this.state.quantity = parseFloat(ev.target.value) || 0;
    }
    onKeydown(ev) {
        if (ev.key === "Enter" || ev.keyCode === 13 || ev.which === 13) {
            ev.preventDefault();
            ev.stopPropagation();
            this.confirm();
        }
    }
    async confirm() {
        if (this.state.quantity <= 0) {
            return;
        }
        await this.props.confirm(this.state.quantity);
        this.props.close();
    }
}
BarcodeQuantityDialog.template = xml`
    <Dialog title="props.title">
        <div class="mb-3">
            <strong>Producto:</strong> <span t-esc="props.productName"/>
        </div>
        <div class="mb-3">
            <label for="barcode_qty_input" class="form-label">Cantidad:</label>
            <input type="number" class="o_input" id="barcode_qty_input" t-ref="qtyInput" t-att-value="state.quantity" t-on-input="onInput" t-on-keydown.stop.prevent="onKeydown" step="0.01"/>
        </div>
        <t t-set-slot="footer">
            <button class="btn btn-primary" t-on-click="confirm">Agregar</button>
            <button class="btn btn-secondary" t-on-click="props.close">Cancelar</button>
        </t>
    </Dialog>
`;
BarcodeQuantityDialog.components = { Dialog };
BarcodeQuantityDialog.props = ["*"];

export class PickingBarcodeScanner extends Component {
    setup() {
        this.inputRef = useRef("input");
        this.orm = useService("orm");
        this.notification = useService("notification");
        this.dialog = useService("dialog");

        onMounted(() => {
            console.log("[BarcodeScanner] Widget montado en campo", this.props.name);
            if (this.inputRef.el) {
                this.inputRef.el.focus();
            }
        });
    }

    get value() {
        return this.props.record.data[this.props.name] || "";
    }

    onInput(ev) {
        this.props.record.update({ [this.props.name]: ev.target.value });
    }

    onSubmit(ev) {
        ev.preventDefault();
        ev.stopPropagation();
    }

    async onKeydown(ev) {
        if (ev.key === "Enter" || ev.keyCode === 13 || ev.which === 13) {
            ev.preventDefault();
            ev.stopPropagation();
            const barcode = ev.target.value.trim();
            console.log("[BarcodeScanner] Scan capturado:", barcode);
            if (!barcode) return;

            let pickingId = this.props.record.resId;

            // Si el picking es nuevo, guardarlo primero
            if (!pickingId) {
                const saved = await this.props.record.save();
                if (!saved) {
                    this.notification.add(
                        "Guarde la orden de traslado antes de escanear.",
                        { type: "warning" }
                    );
                    return;
                }
                pickingId = this.props.record.resId;
            }

            try {
                const productInfo = await this.orm.call(
                    "stock.picking",
                    "get_product_by_barcode",
                    [pickingId, barcode],
                    { context: this.props.record.context }
                );

                if (productInfo.error) {
                    this.notification.add(productInfo.message, {
                        title: productInfo.title,
                        type: "warning",
                    });
                    await this.props.record.update({ [this.props.name]: "" });
                    if (this.inputRef.el) {
                        this.inputRef.el.focus();
                    }
                    return;
                }

                // Abrir dialog para cantidad
                this.dialog.add(
                    BarcodeQuantityDialog,
                    {
                        title: "Agregar producto",
                        productName: productInfo.product_name,
                        confirm: async (quantity) => {
                            await this.orm.call(
                                "stock.picking",
                                "add_product_by_barcode",
                                [pickingId, barcode, quantity],
                                { context: this.props.record.context }
                            );
                            await this.props.record.load();
                        },
                    },
                    {
                        onClose: () => {
                            this.props.record.update({ [this.props.name]: "" });
                            if (this.inputRef.el) {
                                this.inputRef.el.focus();
                            }
                        },
                    }
                );
            } catch (error) {
                console.error(error);
                await this.props.record.update({ [this.props.name]: "" });
            }
        }
    }
}

PickingBarcodeScanner.template = xml`
    <form t-on-submit.prevent="onSubmit" class="o_barcode_scan_form">
        <input
            type="text"
            t-ref="input"
            class="o_input"
            t-att-value="value"
            t-on-input="onInput"
            t-on-keydown="onKeydown"
            t-att-placeholder="props.placeholder || 'Escanee con la pistola...'"
        />
    </form>
`;
PickingBarcodeScanner.props = {
    ...standardFieldProps,
};

export const pickingBarcodeScanner = {
    component: PickingBarcodeScanner,
};

registry.category("fields").add("picking_barcode_scanner", pickingBarcodeScanner);
