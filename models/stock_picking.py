# -*- coding: utf-8 -*-
from odoo import _, api, fields, models


class StockPicking(models.Model):
    _inherit = "stock.picking"

    barcode_scan = fields.Char(
        string="Escanear Código de Barras",
        help="Escanee el código de barras del producto para agregarlo a la orden de traslado.",
    )

    def _search_product_by_scan(self, barcode):
        """Busca un producto por código de barras o referencia interna.
        Retorna el producto o None."""
        barcode = (barcode or "").strip()
        if not barcode:
            return None
        # Búsqueda case-insensitive en barcode y default_code
        return self.env["product.product"].search(
            [
                "|",
                ("barcode", "=ilike", barcode),
                ("default_code", "=ilike", barcode),
            ],
            limit=1,
        )

    @api.model
    def get_product_by_barcode(self, picking_id, barcode):
        """Busca un producto por código de barras o referencia interna.
        Retorna info del producto o un dict con error."""
        barcode = (barcode or "").strip()
        if not barcode:
            return {
                "error": True,
                "title": _("Error"),
                "message": _("Código de barras vacío."),
            }

        product = self._search_product_by_scan(barcode)
        if not product:
            return {
                "error": True,
                "title": _("Producto no encontrado"),
                "message": _(
                    "No existe ningún producto con el código: %s"
                )
                % barcode,
            }

        return {
            "error": False,
            "product_id": product.id,
            "product_name": product.display_name,
        }

    @api.model
    def add_product_by_barcode(self, picking_id, barcode, quantity):
        """Agrega o suma una línea de producto al picking según el barcode y cantidad."""
        barcode = (barcode or "").strip()
        quantity = float(quantity or 0)
        if not barcode or quantity <= 0:
            return False

        product = self._search_product_by_scan(barcode)
        if not product:
            return False

        picking = self.browse(picking_id)
        if not picking.exists():
            return False

        existing_move = picking.move_ids_without_package.filtered(
            lambda m: m.product_id == product
        )

        if existing_move:
            existing_move[0].product_uom_qty += quantity
        else:
            vals = {
                "product_id": product.id,
                "product_uom_qty": quantity,
                "product_uom": product.uom_id.id,
                "name": product.display_name or product.name,
                "location_id": picking.location_id.id,
                "location_dest_id": picking.location_dest_id.id,
            }
            picking.move_ids_without_package = [fields.Command.create(vals)]

        return True
