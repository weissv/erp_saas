import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { api } from "../../lib/api";
import { cn } from "../../lib/utils";
import { FINANCE_CATEGORIES, FINANCE_TYPES } from "../../lib/constants";
import type { Transaction } from "../../types/finance";
import { Button } from "../ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { Input, inputBaseClassName } from "../ui/input";

interface TransactionFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: Transaction | null;
}

const transactionSchema = z.object({
  date: z.string().min(1, "Укажите дату"),
  amount: z.coerce.number().positive("Сумма должна быть больше нуля"),
  type: z.enum(["INCOME", "EXPENSE"]),
  category: z.enum(["NUTRITION", "CLUBS", "MAINTENANCE", "SALARY", "OTHER"]),
  description: z.string().max(500, "Описание слишком длинное").optional().or(z.literal("")),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

export function TransactionForm({ onSuccess, onCancel, initialData }: TransactionFormProps) {
  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: initialData?.amount ?? 0,
      type: initialData?.type === "EXPENSE" ? "EXPENSE" : "INCOME",
      category:
        initialData?.category && initialData.category in FINANCE_CATEGORIES
          ? (initialData.category as TransactionFormData["category"])
          : "CLUBS",
      description: initialData?.description ?? "",
      date: initialData?.date
        ? new Date(initialData.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    },
  });

  const onSubmit = async (values: TransactionFormData) => {
    try {
      const payload = {
        ...values,
        description: values.description || undefined,
      };

      if (initialData) {
        await api.put(`/api/finance/transactions/${initialData.id}`, payload);
      } else {
        await api.post("/api/finance/transactions", payload);
      }

      onSuccess();
    } catch (error: any) {
      toast.error("Не удалось сохранить транзакцию", {
        description: error?.message || "Проверьте данные и попробуйте снова.",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Дата</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Сумма</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0"
                    {...field}
                    value={Number.isFinite(field.value) ? field.value : ""}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Тип</FormLabel>
                <FormControl>
                  <select className={cn(inputBaseClassName, "appearance-none")} {...field}>
                    {Object.entries(FINANCE_TYPES).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Категория</FormLabel>
                <FormControl>
                  <select className={cn(inputBaseClassName, "appearance-none")} {...field}>
                    {Object.entries(FINANCE_CATEGORIES).map(([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Описание</FormLabel>
              <FormControl>
                <Input placeholder="Краткое описание операции" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={form.formState.isSubmitting}>
            Отмена
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {form.formState.isSubmitting ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
