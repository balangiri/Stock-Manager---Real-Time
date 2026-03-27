import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function getSupabaseClient(authToken?: string) {
  if (authToken) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${authToken}` },
      },
    });
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

function getToken(request: NextRequest): string | undefined {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return undefined;
}

// GET all watchlist items for the logged-in user
export async function GET(request: NextRequest) {
  try {
    const token = getToken(request);
    const supabase = getSupabaseClient(token);

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

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

// POST - add a stock to watchlist
export async function POST(request: NextRequest) {
  try {
    const token = getToken(request);
    const supabase = getSupabaseClient(token);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

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
        {
          symbol: symbol.toUpperCase(),
          name: name || symbol,
          user_id: user.id,
        },
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

// DELETE - remove a stock from watchlist
export async function DELETE(request: NextRequest) {
  try {
    const token = getToken(request);
    const supabase = getSupabaseClient(token);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

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
