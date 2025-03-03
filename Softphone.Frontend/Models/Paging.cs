namespace Softphone.Frontend.Models
{
    public class Paging<T>
    {
        public Paging()
        {
            Data = new List<T>();
        }

        public int RecordsTotal { get; set; }
        public IList<T> Data { get; set; }
    }
}
