import { describe, expect, it } from 'vitest';
import { createOrderSchema } from './procurement.schema';

const validBody = {
  type: 'PLANNED',
  title: 'Закупка бумаги',
  priority: 0,
  items: [
    {
      name: 'Бумага A4',
      quantity: 10,
      unit: 'пач',
      price: 35000,
    },
  ],
};

describe('createOrderSchema', () => {
  it('разрешает создание заказа без orderDate', async () => {
    const parsed = await createOrderSchema.parseAsync({
      body: validBody,
      params: {},
      query: {},
    });

    expect(parsed.body.title).toBe(validBody.title);
    expect(parsed.body.orderDate).toBeUndefined();
  });

  it('отклоняет невалидный orderDate, если он передан', async () => {
    await expect(
      createOrderSchema.parseAsync({
        body: {
          ...validBody,
          orderDate: 'not-a-date',
        },
        params: {},
        query: {},
      })
    ).rejects.toThrow();
  });
});