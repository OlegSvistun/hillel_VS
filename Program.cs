using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Donat
{
    internal class Program
    {
        static void Main(string[] args)
        {
            int orderNum;
            string name;
            string productName;
            double productPrice;
            string adressName;
            int adressNum;

            Console.WriteLine("Вкажіть номер замовлення: ");
            orderNum = Convert.ToInt32(Console.ReadLine());
            Console.WriteLine("Вкажіть ім'я: ");
            name = Console.ReadLine();
            Console.WriteLine("Вкажіть продукт: ");
            productName = Console.ReadLine();
            Console.WriteLine("Вкажіть ціну: ");
            productPrice = Convert.ToDouble(Console.ReadLine());
            Console.WriteLine("Вкажіть адресу: ");
            adressName = Console.ReadLine();
            Console.WriteLine("Вкажіть номер будинку: ");
            adressNum = Convert.ToInt32(Console.ReadLine());
            Console.WriteLine($"Order No {orderNum} ");
            Console.WriteLine($"Client: {name}");
            Console.WriteLine($"Product: {productName}, price {productPrice} EUR");
            Console.WriteLine($"Adress: {adressName}, {adressNum}");

            Console.WriteLine("Вкажіть номер замовлення: ");
            orderNum = Convert.ToInt32(Console.ReadLine());
            Console.WriteLine("Вкажіть ім'я: ");
            name = Console.ReadLine();
            Console.WriteLine("Вкажіть продукт: ");
            productName = Console.ReadLine();
            Console.WriteLine("Вкажіть ціну: ");
            productPrice = Convert.ToDouble(Console.ReadLine());
            Console.WriteLine("Вкажіть адресу: ");
            adressName = Console.ReadLine();
            Console.WriteLine("Вкажіть номер будинку: ");
            adressNum = Convert.ToInt32(Console.ReadLine());
            Console.WriteLine($"Order No {orderNum} ");
            Console.WriteLine($"Client: {name}");
            Console.WriteLine($"Product: {productName}, price {productPrice} EUR");
            Console.WriteLine($"Adress: {adressName}, {adressNum}");

            Console.WriteLine("Вкажіть номер замовлення: ");
            orderNum = Convert.ToInt32(Console.ReadLine());
            Console.WriteLine("Вкажіть ім'я: ");
            name = Console.ReadLine();
            Console.WriteLine("Вкажіть продукт: ");
            productName = Console.ReadLine();
            Console.WriteLine("Вкажіть ціну: ");
            productPrice = Convert.ToDouble(Console.ReadLine());
            Console.WriteLine("Вкажіть адресу: ");
            adressName = Console.ReadLine();
            Console.WriteLine("Вкажіть номер будинку: ");
            adressNum = Convert.ToInt32(Console.ReadLine());
            Console.WriteLine($"Order No {orderNum} ");
            Console.WriteLine($"Client: {name}");
            Console.WriteLine($"Product: {productName}, price {productPrice} EUR");
            Console.WriteLine($"Adress: {adressName}, {adressNum}");
        }
    }
}
