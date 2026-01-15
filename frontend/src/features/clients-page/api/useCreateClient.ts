import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { ClientCrudResponse, ClientFormData } from '../types';

async function fetchCreateClient(formData: ClientFormData): Promise<ClientCrudResponse> {
    const { data } = await api.post<ClientCrudResponse>('/clients-crud/create', formData);
    return data;
}


export function useCreateClient(formData: ClientFormData) {
    console.log(fetchCreateClient(formData));

    // const query = useQuery({
    //     queryKey: ['health'],
    //     queryFn: () => fetchCreateClient(formData),
    //     refetchInterval: false,
    //     retry: false,
    // });

} 