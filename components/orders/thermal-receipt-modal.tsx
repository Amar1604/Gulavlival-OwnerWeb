"use client";

import React from "react";
import { Printer, X, CheckCircle2 } from "lucide-react";
import { Order } from "@/types";

interface ThermalReceiptModalProps {
  order: Order;
  onClose: () => void;
}

export function ThermalReceiptModal({ order, onClose }: ThermalReceiptModalProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="max-w-sm w-full my-auto flex flex-col items-center">
        {/* Modal Controls */}
        <div className="w-full flex justify-between items-center mb-3 text-white px-1">
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Digital Thermal Slip</span>
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* The Authentic Thermal Receipt Paper */}
        <div
          id="printable-thermal-receipt"
          className="w-full bg-white text-black p-6 font-mono text-xs shadow-2xl rounded-sm border-t-4 border-amber-600 select-all"
          style={{ maxWidth: "340px" }}
        >
          {/* Receipt Header */}
          <div className="text-center pb-3 border-b border-dashed border-neutral-400 space-y-1">
            <h2 className="font-extrabold text-base tracking-wider uppercase">
              GULAVLIVAL GRAND
            </h2>
            <p className="text-[10px] tracking-widest text-neutral-600">
              Stay • Dine • Experience
            </p>
            <p className="text-[9px] text-neutral-500">
              Main Highway Road, Gulavlival
            </p>
            <p className="text-[9px] text-neutral-500">
              Ph: +91 98765 43210
            </p>
          </div>

          {/* Meta Info */}
          <div className="py-2.5 border-b border-dashed border-neutral-400 text-[10px] space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-600">ORDER #:</span>
              <span className="font-bold">{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-600">DATE:</span>
              <span>
                {new Date(order.created_at).toLocaleDateString()}{" "}
                {new Date(order.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-neutral-600">TYPE:</span>
              <span>{order.order_type}</span>
            </div>
            {order.table_number && (
              <div className="flex justify-between font-black text-xs text-black pt-0.5">
                <span>TABLE:</span>
                <span className="text-sm">TABLE {order.table_number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-neutral-600">GUEST:</span>
              <span className="truncate max-w-[150px]">{order.customer_name}</span>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="py-2.5 border-b border-dashed border-neutral-400">
            <div className="flex justify-between text-[10px] font-bold pb-1 text-neutral-600 border-b border-neutral-300">
              <span>QTY ITEM</span>
              <span>PRICE</span>
            </div>
            <div className="divide-y divide-dotted divide-neutral-200 pt-1">
              {order.items.map((item, idx) => (
                <div key={idx} className="py-1.5 flex justify-between items-start text-[11px]">
                  <div className="pr-2">
                    <span className="font-bold">{item.quantity}×</span>{" "}
                    <span>{item.item_name_snapshot}</span>
                    {item.variant_name_snapshot && (
                      <span className="block text-[9px] text-neutral-500 pl-4">
                        ({item.variant_name_snapshot})
                      </span>
                    )}
                  </div>
                  <span className="font-semibold whitespace-nowrap">
                    ₹{item.line_total.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="py-2.5 space-y-1 text-[11px]">
            <div className="flex justify-between text-neutral-600">
              <span>SUBTOTAL:</span>
              <span>₹{order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-neutral-600">
              <span>CGST + SGST (5%):</span>
              <span>₹{order.tax.toFixed(2)}</span>
            </div>
            {order.delivery_charge > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>DELIVERY FEE:</span>
                <span>₹{order.delivery_charge.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-extrabold text-sm pt-2 border-t-2 border-black">
              <span>TOTAL (CASH):</span>
              <span>₹{order.total.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-3 border-t border-dashed border-neutral-400 text-center text-[10px] space-y-1 text-neutral-600">
            <p className="font-bold uppercase tracking-wider">
              *** Thank You! Visit Again ***
            </p>
            <p className="text-[9px]">All prices inclusive of applicable taxes.</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex space-x-3 mt-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold flex items-center justify-center space-x-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
