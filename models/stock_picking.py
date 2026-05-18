# -*- coding: utf-8 -*-
from odoo import _, api, fields, models


class StockPicking(models.Model):
    _inherit = "stock.picking"

    barcode_scan = fields.Char(
        string="Escanear Código de Barras",
        help="Escanee el código de barras del producto para agregarlo a la orden de traslado.",
    )

    @api.onchange("barcode_scan")
    def _onchange_barcode_scan(self):
        if not self.barcode_scan:
            return

        barcode = self.barcode_scan.strip()
        if not barcode:
            self.barcode_scan = False
            return

        product = self.env["product.product"].search(
            [("barcode", "=", barcode)], limit=1
        )

        if not product:
            self.barcode_scan = False
            return {
                "warning": {
                    "title": _("Producto no encontrado"),
                    "message": _(
                        "No existe ningún producto con el código de barras: %s"
                    )
                    % barcode,
                }
            }

        # Buscar si ya existe una línea con este producto para sumar cantidad
        existing_move = self.move_ids_without_package.filtered(
            lambda m: m.product_id == product
        )

        if existing_move:
            # Sumar 1 a la cantidad de la primera línea encontrada
            existing_move[0].product_uom_qty += 1.0
        else:
            # Crear nueva línea
            vals = {
                "product_id": product.id,
                "product_uom_qty": 1.0,
                "product_uom": product.uom_id.id,
                "name": product.display_name or product.name,
                "location_id": self.location_id.id,
                "location_dest_id": self.location_dest_id.id,
            }
            self.move_ids_without_package = [fields.Command.create(vals)]

        # Limpiar el campo para el próximo escaneo
        self.barcode_scan = False
