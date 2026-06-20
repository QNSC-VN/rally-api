export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface IUserRepository {
  findByEmail(email: string): Promise<unknown | null>;
  findById(id: string): Promise<unknown | null>;
  save(user: unknown): Promise<void>;
}
