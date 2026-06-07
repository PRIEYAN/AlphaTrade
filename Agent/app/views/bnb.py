import re

from flask import Blueprint, current_app, jsonify, request

bp = Blueprint("bnb", __name__)

_ADDRESS_RE = re.compile(r"^0x[a-fA-F0-9]{40}$")


@bp.get("/api/bnb/context")
def context():
    controller = current_app.extensions["bnb_controller"]
    try:
        return jsonify({"ok": True, **controller.get_context()})
    except Exception as e:  # RPC failure
        return jsonify({"ok": False, "error": str(e)}), 502


@bp.get("/api/bnb/balance")
def balance():
    address = request.args.get("address", "")
    if not _ADDRESS_RE.match(address):
        return jsonify({"error": "valid ?address= required"}), 400
    controller = current_app.extensions["bnb_controller"]
    try:
        return jsonify({"ok": True, **controller.get_balance(address)})
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 502
