import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const getProductAndStockById = async (id: number) => {
    const { data: product } = await api.get<Product>(`products/${id}`)
    const { data: stock } = await api.get<Product>(`stock/${id}`)

    return {
      product,
      stock
    }
  }

  const addProduct = async (productId: number) => {
    try {
      const hasTheSameProduct = cart.find((product: Product) => product.id === productId)
      const { product, stock } = await getProductAndStockById(productId)

      if (!hasTheSameProduct) {
        if (stock.amount > 0) {
          const data = [ ...cart, { ...product, amount: 1}]
          setCart(data)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(data))
          toast('Adicionado')
          return
        }
      }

      if (hasTheSameProduct) {
        if (stock.amount > hasTheSameProduct.amount) {
          const incrementAmount = cart.map((cartItem) => cartItem.id === productId ? {
            ...cartItem,
            amount: Number(cartItem.amount) + 1,
          } : cartItem)
          
          setCart(incrementAmount)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(incrementAmount))
          return
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
      
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productIndex = updatedCart.findIndex((product) => product.id === productId)

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1)
        setCart(updatedCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))  
      } else {
        throw new Error();
      }
      
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const updatedCart = [...cart]
      const productExists = updatedCart.find((product: Product) => product.id === productId)
      const stock = await api.get(`/stock/${productId}`)

      if (amount <= 0) {
        return
      }

      if (amount > stock.data.amount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      if (productExists) {
        productExists.amount = amount
        setCart(updatedCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        throw new Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
