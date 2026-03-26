import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// GET all watchlist items
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Watchlist fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch watchlist" },
      { status: 500 }
    );
  }
}

// POST - add a stock to watchlist
export async function POST(request: NextRequest) {
  try {
    const { symbol, name } = await request.json();

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol is required" },
        { status: 400 }
      );
    }

    // Check if already exists
    const { data: existing } = await supabase
      .from("watchlist")
      .select("id")
      .eq("symbol", symbol.toUpperCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Stock already in watchlist" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("watchlist")
      .insert([{ symbol: symbol.toUpperCase(), name: name || symbol }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Watchlist add error:", error);
    return NextResponse.json(
      { error: "Failed to add to watchlist" },
      { status: 500 }
    );
  }
}

// DELETE - remove a stock from watchlist
export async function DELETE(request: NextRequest) {
  try {
    const { symbol } = await request.json();

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("watchlist")
      .delete()
      .eq("symbol", symbol.toUpperCase());

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Watchlist delete error:", error);
    return NextResponse.json(
      { error: "Failed to remove from watchlist" },
      { status: 500 }
    );
  }
}
