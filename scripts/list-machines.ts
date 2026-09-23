import { supabase } from "./admin-client";

async function main() {
  const { data } = await supabase.from("machines").select("id, name, category, brand").order("category").order("name");
  console.log(JSON.stringify(data, null, 2));
}

main();
