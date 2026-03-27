import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Helper: get authenticated user or return 401
async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, supabase, unauthorized: true };
  }
  return { user, supabase, unauthorized: false };
}

// GET all watchlist items for the authenticated user
export async function GET() {
  const { user, supabase, unauthorized } = await getAuthenticatedUser();
  if (unauthorized || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabase
      .from("watchlist")
      .select("*")
      .eq("user_id", user.id)
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

// POST - add a stock to watchlist for the authenticated user
export async function POST(request: NextRequest) {
  const { user, supabase, unauthorized } = await getAuthenticatedUser();
  if (unauthorized || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { symbol, name } = await request.json();

    if (!symbol) {
      return NextResponse.json(
        { error: "Symbol is required" },
        { status: 400 }
      );
    }

    // Check if already exists for this user
    const { data: existing } = await supabase
      .from("watchlist")
      .select("id")
      .eq("symbol", symbol.toUpperCase())
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Stock already in watchlist" },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("watchlist")
      .insert([
        { symbol: symbol.toUpperCase(), name: name || symbol, user_id: user.id },
      ])
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

// DELETE - remove a stock from the authenticated user's watchlist
export async function DELETE(request: NextRequest) {
  const { user, supabase, unauthorized } = await getAuthenticatedUser();
  if (unauthorized || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      .eq("symbol", symbol.toUpperCase())
      .eq("user_id", user.id);

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
