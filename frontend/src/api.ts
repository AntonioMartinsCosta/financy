export type User = { id: string; name: string; email: string };
export type Category = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  transactionCount: number;
};
export type Transaction = {
  id: string;
  description: string;
  amount: number;
  date: string;
  type: "INCOME" | "EXPENSE";
  category: Category | null;
};
export type Data = {
  me: User;
  categories: Category[];
  transactions: Transaction[];
};
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}
export const getToken = () =>
  localStorage.getItem("financy.token") ??
  sessionStorage.getItem("financy.token");
export function saveToken(token: string, remember: boolean) {
  clearToken();
  (remember ? localStorage : sessionStorage).setItem("financy.token", token);
}
export function clearToken() {
  localStorage.removeItem("financy.token");
  sessionStorage.removeItem("financy.token");
}
export async function gql<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(
      import.meta.env.VITE_BACKEND_URL ?? "http://127.0.0.1:4000/graphql",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({ query, variables }),
      },
    );
  } catch {
    throw new ApiError(
      "Não foi possível conectar. Verifique sua conexão e tente novamente.",
    );
  }
  if (!response.ok)
    throw new ApiError(
      "Não foi possível concluir a solicitação. Tente novamente.",
    );
  const payload = await response.json();
  if (payload.errors?.length)
    throw new ApiError(
      payload.errors[0].message,
      payload.errors[0].extensions?.code,
    );
  return payload.data as T;
}
export const dataQuery = `query { me { id name email } categories { id name description color icon transactionCount } transactions { id description amount date type category { id name description color icon transactionCount } } }`;
