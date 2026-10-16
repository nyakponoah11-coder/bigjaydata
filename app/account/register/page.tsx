import { redirect } from "next/navigation";

export default function AccountRegisterRedirect() {
  redirect("/signup");
}
