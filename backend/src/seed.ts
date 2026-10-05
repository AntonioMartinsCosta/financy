import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "./auth.js";
const db = new PrismaClient();
const email = "conta@teste.com";
async function seed() {
  if (await db.user.findUnique({ where: { email } })) {
    console.log("Conta de demonstração já existe; dados preservados.");
    return;
  }
  const user = await db.user.create({
    data: {
      name: "Conta teste",
      email,
      passwordHash: hashPassword("Financy123!"),
    },
  });
  const definitions = [
    ["Alimentação", "Restaurantes, delivery e refeições", "blue", "Utensils"],
    ["Entretenimento", "Cinema, jogos e lazer", "pink", "Ticket"],
    ["Investimento", "Aplicações e retornos financeiros", "green", "PiggyBank"],
    [
      "Mercado",
      "Compras de supermercado e mantimentos",
      "orange",
      "ShoppingCart",
    ],
    ["Salário", "Renda mensal e bonificações", "green", "BriefcaseBusiness"],
    ["Saúde", "Medicamentos, consultas e exames", "red", "HeartPulse"],
    [
      "Transporte",
      "Gasolina, transporte público e viagens",
      "purple",
      "CarFront",
    ],
    ["Utilidades", "Energia, água, internet e telefone", "yellow", "ToolCase"],
  ];
  const ids: Record<string, string> = {};
  for (const [name, description, color, icon] of definitions) {
    const c = await db.category.create({
      data: { name, description, color, icon, userId: user.id },
    });
    ids[name] = c.id;
  }
  const rows: [string, number, string, string, string][] = [
    ["Pagamento de Salário", 425000, "2025-12-01", "INCOME", "Salário"],
    ["Jantar no Restaurante", 8950, "2025-11-30", "EXPENSE", "Alimentação"],
    ["Posto de Gasolina", 10000, "2025-11-29", "EXPENSE", "Transporte"],
    ["Compras no Mercado", 15680, "2025-11-28", "EXPENSE", "Mercado"],
    ["Retorno de Investimento", 34025, "2025-11-26", "INCOME", "Investimento"],
    ["Aluguel", 170000, "2025-11-26", "EXPENSE", "Utilidades"],
    ["Freelance", 250000, "2025-11-24", "INCOME", "Salário"],
    ["Compras para Jantar", 15000, "2025-11-22", "EXPENSE", "Mercado"],
    ["Cinema", 8800, "2025-11-18", "EXPENSE", "Entretenimento"],
  ];
  for (const [description, amount, date, type, category] of rows)
    await db.transaction.create({
      data: {
        description,
        amount,
        date,
        type,
        categoryId: ids[category],
        userId: user.id,
      },
    });
  console.log("Demonstração criada: conta@teste.com / Financy123!");
}
try {
  await seed();
} finally {
  await db.$disconnect();
}
