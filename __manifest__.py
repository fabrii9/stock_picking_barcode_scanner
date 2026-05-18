# -*- coding: utf-8 -*-
{
    "name": "Stock Picking Barcode Scanner",
    "summary": "Campo de escaneo de código de barras en órdenes de traslado con popup de cantidad",
    "version": "18.0.2.0.0",
    "category": "Inventory/Stock",
    "author": "Mundolimpio",
    "license": "LGPL-3",
    "depends": [
        "stock",
        "product",
    ],
    "data": [
        "views/stock_picking_views.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "stock_picking_barcode_scanner/static/src/js/barcode_scan_widget.js",
        ],
    },
    "installable": True,
    "application": False,
    "auto_install": False,
}
