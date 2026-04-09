// src/lib/formValidation.ts
// Утилиты для валидации форм с React Hook Form

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { UseFormReturn, FieldValues, Path, FieldErrors } from 'react-hook-form';

// ============================================================================
// ТИПЫ
// ============================================================================

export interface ValidationRule {
  value: unknown;
  message: string;
}

export interface FieldValidation {
  required?: string | ValidationRule;
  minLength?: ValidationRule;
  maxLength?: ValidationRule;
  min?: ValidationRule;
  max?: ValidationRule;
  pattern?: ValidationRule;
  validate?: (value: unknown) => string | boolean | Promise<string | boolean>;
}

// ============================================================================
// ZOD RESOLVER ХЕЛПЕР
// ============================================================================

/**
 * Создание resolver для React Hook Form из Zod схемы
 */
export function createResolver<T extends z.ZodSchema>(schema: T) {
  return zodResolver(schema);
}

// ============================================================================
// ВАЛИДАТОРЫ ДЛЯ ФОРМ
// ============================================================================

/**
 * Валидация обязательного поля
 */
export function required(message = 'Это поле обязательно'): ValidationRule {
  return { value: true, message };
}

/**
 * Валидация минимальной длины
 */
export function minLength(length: number, message?: string): ValidationRule {
  return {
    value: length,
    message: message || `Минимум ${length} символов`,
  };
}

/**
 * Валидация максимальной длины
 */
export function maxLength(length: number, message?: string): ValidationRule {
  return {
    value: length,
    message: message || `Максимум ${length} символов`,
  };
}

/**
 * Валидация минимального значения
 */
export function min(value: number, message?: string): ValidationRule {
  return {
    value,
    message: message || `Минимальное значение: ${value}`,
  };
}

/**
 * Валидация максимального значения
 */
export function max(value: number, message?: string): ValidationRule {
  return {
    value,
    message: message || `Максимальное значение: ${value}`,
  };
}

/**
 * Валидация по шаблону
 */
export function pattern(regexp: RegExp, message: string): ValidationRule {
  return { value: regexp, message };
}

// ============================================================================
// ПРЕДУСТАНОВЛЕННЫЕ ПАТТЕРНЫ
// ============================================================================

export const patterns = {
  email: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  phone: /^(\+7|8)?[\s-]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/,
  cyrillic: /^[а-яА-ЯёЁ\s-]+$/,
  latinAndCyrillic: /^[a-zA-Zа-яА-ЯёЁ\s-]+$/,
  onlyDigits: /^\d+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^([01]\d|2[0-3]):([0-5]\d)$/,
  inn: /^\d{10}$|^\d{12}$/,
  snils: /^\d{3}-\d{3}-\d{3}\s?\d{2}$/,
};

// ============================================================================
// КОМБИНИРОВАННЫЕ ВАЛИДАЦИИ
// ============================================================================

/**
 * Валидация email поля
 */
export const emailValidation: FieldValidation = {
  required: required('Email обязателен'),
  pattern: pattern(patterns.email, 'Неверный формат email'),
};

/**
 * Валидация пароля
 */
export const passwordValidation: FieldValidation = {
  required: required('Пароль обязателен'),
  minLength: minLength(6, 'Пароль должен содержать минимум 6 символов'),
  maxLength: maxLength(100, 'Пароль слишком длинный'),
};

/**
 * Валидация телефона
 */
export const phoneValidation: FieldValidation = {
  pattern: pattern(patterns.phone, 'Неверный формат телефона'),
};

/**
 * Валидация имени (ФИО)
 */
export const nameValidation: FieldValidation = {
  required: required('Имя обязательно'),
  minLength: minLength(2, 'Минимум 2 символа'),
  maxLength: maxLength(100, 'Максимум 100 символов'),
  pattern: pattern(patterns.latinAndCyrillic, 'Только буквы и пробелы'),
};

// ============================================================================
// ХЕЛПЕРЫ ДЛЯ ФОРМ
// ============================================================================

/**
 * Получение сообщения об ошибке поля
 */
export function getFieldError<T extends FieldValues>(
  errors: FieldErrors<T>,
  name: Path<T>
): string | undefined {
  const error = errors[name];
  return error?.message as string | undefined;
}

/**
 * Проверка наличия ошибки в поле
 */
export function hasFieldError<T extends FieldValues>(
  errors: FieldErrors<T>,
  name: Path<T>
): boolean {
  return !!errors[name];
}

/**
 * Получение классов для поля с ошибкой
 */
export function getFieldClasses<T extends FieldValues>(
  errors: FieldErrors<T>,
  name: Path<T>,
  baseClasses: string,
  errorClasses: string
): string {
  return hasFieldError(errors, name)
    ? `${baseClasses} ${errorClasses}`
    : baseClasses;
}

/**
 * Класс для отображения состояния валидации
 */
export function getValidationClass<T extends FieldValues>(
  errors: FieldErrors<T>,
  name: Path<T>,
  isDirty: boolean
): 'error' | 'success' | 'default' {
  if (hasFieldError(errors, name)) return 'error';
  if (isDirty && !hasFieldError(errors, name)) return 'success';
  return 'default';
}

// ============================================================================
// ASYNC ВАЛИДАЦИЯ
// ============================================================================

/**
 * Создание debounced async валидатора
 */
export function createDebouncedValidator<T>(
  validator: (value: T) => Promise<string | boolean>,
  delay = 300
): (value: T) => Promise<string | boolean> {
  let timeoutId: NodeJS.Timeout | null = null;

  return (value: T) => {
    return new Promise((resolve) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        const result = await validator(value);
        resolve(result);
      }, delay);
    });
  };
}

/**
 * Проверка уникальности значения через API
 */
export function createUniqueValidator(
  checkFn: (value: string) => Promise<boolean>,
  errorMessage: string
): (value: string) => Promise<string | boolean> {
  return async (value: string) => {
    if (!value) return true;
    const isUnique = await checkFn(value);
    return isUnique || errorMessage;
  };
}

// ============================================================================
// FORM RESET С ДЕФОЛТАМИ
// ============================================================================

/**
 * Сбросить форму к начальным значениям
 */
export function resetFormToDefaults<T extends FieldValues>(
  form: UseFormReturn<T>,
  defaults: T
): void {
  form.reset(defaults);
}

/**
 * Применить частичные изменения к форме
 */
export function applyPartialUpdate<T extends FieldValues>(
  form: UseFormReturn<T>,
  updates: Partial<T>
): void {
  const currentValues = form.getValues();
  form.reset({ ...currentValues, ...updates });
}

// ============================================================================
// СРАВНЕНИЕ ПАРОЛЕЙ
// ============================================================================

/**
 * Валидация подтверждения пароля
 */
export function confirmPasswordValidator(
  getPasswordValue: () => string
): (value: string) => string | boolean {
  return (value: string) => {
    const password = getPasswordValue();
    return value === password || 'Пароли не совпадают';
  };
}

// ============================================================================
// УСЛОВНАЯ ВАЛИДАЦИЯ
// ============================================================================

/**
 * Создание условного валидатора
 */
export function conditionalRequired<T>(
  condition: (formValues: T) => boolean,
  message = 'Это поле обязательно'
): (value: unknown, formValues: T) => string | boolean {
  return (value: unknown, formValues: T) => {
    if (condition(formValues) && !value) {
      return message;
    }
    return true;
  };
}
